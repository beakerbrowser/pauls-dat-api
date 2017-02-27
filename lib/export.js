const assert = require('assert')
const maybe = require('call-me-maybe')
const co = require('co')
const hyperImport = require('hyperdrive-import-files')
const path = require('path')
const fsp = require('fs-promise')
const pump = require('pump')
const match = require('anymatch')
const {ArchiveNotWritableError, SourceNotFoundError, DestDirectoryNotEmpty} = require('beaker-error-constants')
const {normalizeArchive, normalizeEntryName} = require('./common')
const {lookupEntry} = require('./lookup')
const {listFiles} = require('./read')

const DEFAULT_IGNORE = ['.dat', '**/.dat', '.git', '**/.git']

// copy files from the filesystem into an archive
function exportFilesystemToArchive (opts, cb) {
  return maybe(cb, co(function* () {
    assert(opts && typeof opts === 'object', 'opts object is required')

    // core arguments, srcPath and dstArchive
    var srcPath = opts.srcPath
    var dstArchive = normalizeArchive(opts.dstArchive)
    assert(srcPath && typeof srcPath === 'string', 'srcPath is required')
    assert(dstArchive && typeof dstArchive === 'object', 'dstArchive is required')

    // options
    var dstPath = typeof opts.dstPath === 'string' ? opts.dstPath : '/'
    var ignore = Array.isArray(opts.ignore) ? opts.ignore : DEFAULT_IGNORE
    var inplaceImport = opts.inplaceImport === true
    var dryRun = opts.dryRun === true

    // ensure we have the archive's private key
    if (!dstArchive.owner && !dryRun) {
      throw new ArchiveNotWritableError()
    }

    // make source the source exists
    var srcStat
    try {
      srcStat = yield fsp.stat(srcPath)
    } catch (e) {
      throw new SourceNotFoundError(e.toString())
    }

    // if reading from a directory, and not doing an implace-import,
    // then put the dstPath at a subpath so that the folder's contents dont
    // get imported in-place into the archive
    if (srcStat.isDirectory() && !inplaceImport) {
      dstPath = path.join(dstPath, path.basename(srcPath))
    }

    // read the file or file-tree into the archive
    return new Promise((resolve, reject) => {
      var stats = { addedFiles: [], updatedFiles: [], skipCount: 0, fileCount: 0, totalSize: 0 }
      var status = hyperImport(dstArchive, srcPath, {
        basePath: dstPath,
        live: false,
        resume: true,
        compareFileContent: true,
        ignore,
        dryRun
      }, (err) => {
        if (err) return reject(err)
        stats.fileCount = status.fileCount
        stats.totalSize = status.totalSize
        resolve(stats)
      })
      status.on('file imported', e => {
        if (e.mode === 'created') stats.addedFiles.push(e.path)
        if (e.mode === 'updated') stats.updatedFiles.push(e.path)
      })
      status.on('file skipped', e => {
        stats.skipCount++
      })
    })
  }))
}

// copy files from an archive into the filesystem
function exportArchiveToFilesystem (opts, cb) {
  return maybe(cb, co(function* () {
    assert(opts && typeof opts === 'object', 'opts object is required')

    // core arguments, dstPath and srcArchive
    var srcArchive = normalizeArchive(opts.srcArchive)
    var dstPath = opts.dstPath
    assert(srcArchive && typeof srcArchive === 'object', 'srcArchive is required')
    assert(dstPath && typeof dstPath === 'string', 'dstPath is required')

    // options
    var srcPath = typeof opts.srcPath === 'string' ? opts.srcPath : '/'
    var overwriteExisting = opts.overwriteExisting === true
    var skipUndownloadedFiles = opts.skipUndownloadedFiles === true
    var ignore = Array.isArray(opts.ignore) ? opts.ignore : DEFAULT_IGNORE

    // abort if nonempty and not overwriting existing
    if (!overwriteExisting) {
      let files
      try {
        files = yield fsp.readdir(dstPath)
      } catch (e) {
        // target probably doesnt exist, continue and let ensureDirectory handle it
      }
      if (files && files.length > 0) {
        throw new DestDirectoryNotEmpty()
      }
    }

    const statThenExport = co.wrap(function* (srcEntryPath, dstFilePath, srcEntry) {
      // apply ignore filter
      if (ignore && match(ignore, srcEntryPath)) {
        return
      }

      // get the srcEntry if not yet gotten
      if (!srcEntry) {
        srcEntry = yield lookupEntry(srcArchive, srcEntryPath)
        if (!srcEntry) {
          // assume this is a directory
          // ...they're not always explicitly declared in hyperdrive archives
          srcEntry = {
            type: 'directory',
            name: srcEntryPath
          }
        }
      }

      // export by type
      if (srcEntry.type === 'file') {
        yield exportFile(srcEntry, dstFilePath)
      } else if (srcEntry.type === 'directory') {
        yield exportDirectory(srcEntry, dstFilePath)
      }
    })

    const exportFile = co.wrap(function* (srcEntry, dstFilePath) {
      // skip undownloaded files
      if (skipUndownloadedFiles && !srcArchive.isEntryDownloaded(srcEntry)) {
        return
      }

      // fetch dest stats
      var dstFileStats = null
      try {
        dstFileStats = yield fsp.stat(dstFilePath)
      } catch (e) {}

      // track the stats
      stats.fileCount++
      stats.totalSize += srcEntry.length || 0
      if (dstFileStats) {
        if (dstFileStats.isDirectory()) {
          // delete the directory-tree
          yield fsp.remove(dstFilePath)
          stats.addedFiles.push(dstFilePath)
        } else {
          stats.updatedFiles.push(dstFilePath)
        }
      } else {        
        stats.addedFiles.push(dstFilePath)
      }

      // write the file
      return new Promise((resolve, reject) => {
        pump(
          srcArchive.createFileReadStream(srcEntry),
          fsp.createWriteStream(dstFilePath),
          err => {
            if (err) reject(err)
            else resolve()
          }
        )
      })
    })

    const exportDirectory = co.wrap(function* (srcEntry, dstFilePath) {
      // make sure the destination folder exists
      yield fsp.ensureDir(dstFilePath)

      // list the directory
      var entries = yield listFiles(srcArchive, srcEntry.name)

      // recurse into each
      var promises = Object.keys(entries).map(k => {
        return statThenExport(entries[k].name, path.join(dstFilePath, path.basename(entries[k].name)), entries[k])
      })
      yield Promise.all(promises)
    })

    // recursively export
    var stats = { addedFiles: [], updatedFiles: [], skipCount: 0, fileCount: 0, totalSize: 0 }
    yield statThenExport(srcPath, dstPath)
    return stats
  }))
}

// copy files from one archive into another
function exportArchiveToArchive (opts, cb) {
  return maybe(cb, co(function *() {
    assert(opts && typeof opts === 'object', 'opts object is required')

    // core arguments, dstArchive and srcArchive
    var srcArchive = normalizeArchive(opts.srcArchive)
    var dstArchive = normalizeArchive(opts.dstArchive)
    assert(srcArchive && typeof srcArchive === 'object', 'srcArchive is required')
    assert(dstArchive && typeof dstArchive === 'object', 'dstArchive is required')

    // options
    var srcPath = typeof opts.srcPath === 'string' ? normalizeEntryName(opts.srcPath) : '/'
    var dstPath = typeof opts.dstPath === 'string' ? normalizeEntryName(opts.dstPath) : '/'
    var overwriteExisting = opts.overwriteExisting === true
    var skipUndownloadedFiles = opts.skipUndownloadedFiles === true
    var ignore = Array.isArray(opts.ignore) ? opts.ignore : DEFAULT_IGNORE

    // ensure we have the archive's private key
    if (!dstArchive.owner) {
      throw new ArchiveNotWritableError()
    }

    // list the src archive's files
    // var stats = { addedFiles: [], updatedFiles: [], skipCount: 0, fileCount: 0, totalSize: 0 }
    var entries = yield new Promise((resolve, reject) => {
      srcArchive.list((err, entries) => {
        if (err) reject(err)
        else resolve(entries)
      })
    })

    
    // remove duplicates and pull out from the srcPath
    var entriesDeDuped = {}
    if (srcPath !== '/') srcPath += '/'
    entries.forEach(entry => {
      var name = normalizeEntryName(entry)
      if (name.indexOf(srcPath) === 0) {
        entry.name = name.slice(srcPath.length - 1)
        entriesDeDuped[entry.name] = entry
      }
    })
    entries = Object.keys(entriesDeDuped).map(name => entriesDeDuped[name])

    // copy over files
    for (var i = 0; i < entries.length; i++) {
      let srcEntry = entries[i]
      let srcEntryName = normalizeEntryName(srcEntry)

      // apply ignore filter
      if (ignore && match(ignore, srcEntryName)) {
        continue
      }

      // skip undownloaded files
      if (skipUndownloadedFiles && !srcArchive.isEntryDownloaded(srcEntry)) {
        continue
      }

      // directories
      if (srcEntry.type === 'directory') {
        yield new Promise((resolve, reject) => {
          dstArchive.append({
            name: normalizeEntryName(path.join(dstPath, srcEntryName)),
            type: 'directory',
            ctime: srcEntry.ctime,
            mtime: srcEntry.mtime
          }, err => {
            if (err) reject(err)
            else resolve(err)
          })
        })
        continue
      }


      // skip non-files, undownloaded files, and the old manifest
      if (srcEntry.type !== 'file') {
        continue
      }

      yield new Promise((resolve, reject) => {
        // copy the file
        pump(
          srcArchive.createFileReadStream(srcEntry),
          dstArchive.createFileWriteStream({
            name: normalizeEntryName(path.join(dstPath, srcEntryName)),
            mtime: srcEntry.mtime,
            ctime: srcEntry.ctime
          }),
          err => {
            if (err) reject(err)
            else resolve()
          }
        )
      })
    }
  }))
}

module.exports = {exportFilesystemToArchive, exportArchiveToFilesystem, exportArchiveToArchive}
