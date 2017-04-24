const assert = require('assert')
const maybe = require('call-me-maybe')
const co = require('co')
const hyperImport = require('hyperdrive-import-files')
const path = require('path')
const fsp = require('fs-promise')
const pump = require('pump')
const match = require('anymatch')
const {
  ArchiveNotWritableError,
  SourceNotFoundError,
  DestDirectoryNotEmpty,
  ParentFolderDoesntExistError
} = require('beaker-error-constants')
const {stat} = require('./lookup')
const {readdir} = require('./read')
const {mkdir} = require('./write')
const {unlink, rmdir} = require('./delete')

const DEFAULT_IGNORE = ['.dat', '**/.dat', '.git', '**/.git']

// copy files from the filesystem into an archive
function exportFilesystemToArchive (opts, cb) {
  return maybe(cb, co(function* () {
    assert(opts && typeof opts === 'object', 'opts object is required')

    // core arguments, srcPath and dstArchive
    var srcPath = opts.srcPath
    var dstArchive = opts.dstArchive
    assert(srcPath && typeof srcPath === 'string', 'srcPath is required')
    assert(dstArchive && typeof dstArchive === 'object', 'dstArchive is required')

    // options
    var dstPath = typeof opts.dstPath === 'string' ? opts.dstPath : '/'
    var ignore = Array.isArray(opts.ignore) ? opts.ignore : DEFAULT_IGNORE
    var inplaceImport = opts.inplaceImport === true
    var dryRun = opts.dryRun === true

    // ensure we have the archive's private key
    if (!dstArchive.writable && !dryRun) {
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

    // make sure the destination is a folder
    var dstStat
    try { dstStat = yield stat(dstArchive, dstPath) } catch (e) {}
    if (!dstStat) {
      try { dstStat = yield stat(dstArchive, path.dirname(dstPath)) } catch (e) {}
    }
    if (!dstStat || !dstStat.isDirectory()) {
      throw new ParentFolderDoesntExistError()
    }

    // read the file or file-tree into the archive
    return new Promise((resolve, reject) => {
      var stats = { addedFiles: [], updatedFiles: [], skipCount: 0, fileCount: 0, totalSize: 0 }
      var status = hyperImport(dstArchive, srcPath, {
        basePath: dstPath,
        live: false,
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
    var srcArchive = opts.srcArchive
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

    const statThenExport = co.wrap(function* (srcPath, dstPath) {
      // apply ignore filter
      if (ignore && match(ignore, srcPath)) {
        return
      }

      // export by type
      var srcStat = yield stat(srcArchive, srcPath)
      if (srcStat.isFile()) {
        yield exportFile(srcPath, srcStat, dstPath)
      } else if (srcStat.isDirectory()) {
        yield exportDirectory(srcPath, dstPath)
      }
    })

    const exportFile = co.wrap(function* (srcPath, srcStat, dstPath) {
      // skip undownloaded files
      if (skipUndownloadedFiles && srcStat.downloaded < srcStat.blocks) {
        return
      }

      // fetch dest stats
      var dstFileStats = null
      try {
        dstFileStats = yield fsp.stat(dstPath)
      } catch (e) {}

      // track the stats
      stats.fileCount++
      stats.totalSize += srcStat.size || 0
      if (dstFileStats) {
        if (dstFileStats.isDirectory()) {
          // delete the directory-tree
          yield fsp.remove(dstPath)
          stats.addedFiles.push(dstPath)
        } else {
          stats.updatedFiles.push(dstPath)
        }
      } else {
        stats.addedFiles.push(dstPath)
      }

      // write the file
      return new Promise((resolve, reject) => {
        pump(
          srcArchive.createReadStream(srcPath),
          fsp.createWriteStream(dstPath),
          err => {
            if (err) reject(err)
            else resolve()
          }
        )
      })
    })

    const exportDirectory = co.wrap(function* (srcPath, dstPath) {
      // make sure the destination folder exists
      yield fsp.ensureDir(dstPath)

      // list the directory
      var fileNames = yield readdir(srcArchive, srcPath)

      // recurse into each
      var promises = fileNames.map(name => {
        return statThenExport(path.join(srcPath, name), path.join(dstPath, name))
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
    var srcArchive = opts.srcArchive
    var dstArchive = opts.dstArchive
    assert(srcArchive && typeof srcArchive === 'object', 'srcArchive is required')
    assert(dstArchive && typeof dstArchive === 'object', 'dstArchive is required')

    // options
    var srcPath = typeof opts.srcPath === 'string' ? opts.srcPath : '/'
    var dstPath = typeof opts.dstPath === 'string' ? opts.dstPath : '/'
    var skipUndownloadedFiles = opts.skipUndownloadedFiles === true
    var ignore = Array.isArray(opts.ignore) ? opts.ignore : DEFAULT_IGNORE

    // ensure we have the archive's private key
    if (!dstArchive.writable) {
      throw new ArchiveNotWritableError()
    }

    // make sure the destination is a folder
    var dstStat
    try { dstStat = yield stat(dstArchive, dstPath) } catch (e) {}
    if (!dstStat) {
      try { dstStat = yield stat(dstArchive, path.dirname(dstPath)) } catch (e) {}
    }
    if (!dstStat || !dstStat.isDirectory()) {
      throw new ParentFolderDoesntExistError()
    }

    const statThenExport = co.wrap(function* (srcPath, dstPath) {
      // apply ignore filter
      if (ignore && match(ignore, srcPath)) {
        return
      }

      // export by type
      var srcStat = yield stat(srcArchive, srcPath)
      if (srcStat.isFile()) {
        yield exportFile(srcPath, srcStat, dstPath)
      } else if (srcStat.isDirectory()) {
        yield exportDirectory(srcPath, dstPath)
      }
    })

    const exportFile = co.wrap(function* (srcPath, srcStat, dstPath) {
      // skip undownloaded files
      if (skipUndownloadedFiles && srcStat.downloaded < srcStat.blocks) {
        return
      }

      // fetch dest stats
      var dstFileStats = null
      try {
        dstFileStats = yield stat(dstArchive, dstPath)
      } catch (e) {}

      // track the stats
      stats.fileCount++
      stats.totalSize += srcStat.size || 0
      if (dstFileStats) {
        if (dstFileStats.isDirectory()) {
          // delete the directory-tree
          yield rmdir(dstArchive, dstPath, {recursive: true})
          stats.addedFiles.push(dstPath)
        } else {
          stats.updatedFiles.push(dstPath)
        }
      } else {
        stats.addedFiles.push(dstPath)
      }

      // write the file
      return new Promise((resolve, reject) => {
        pump(
          srcArchive.createReadStream(srcPath),
          dstArchive.createWriteStream(dstPath),
          err => {
            if (err) reject(err)
            else resolve()
          }
        )
      })
    })

    const exportDirectory = co.wrap(function* (srcPath, dstPath) {
      // make sure the destination folder exists
      var dstStat
      try { dstStat = yield stat(dstArchive, dstPath) } catch (e) {}
      if (!dstStat) {
        yield mkdir(dstArchive, dstPath)
      } else if (dstStat.isFile()) {
        yield unlink(dstArchive, dstPath)
        yield mkdir(dstArchive, dstPath)
      }

      // list the directory
      var fileNames = yield readdir(srcArchive, srcPath)

      // recurse into each
      var promises = fileNames.map(name => {
        return statThenExport(path.join(srcPath, name), path.join(dstPath, name))
      })
      yield Promise.all(promises)
    })

    // recursively export
    var stats = { addedFiles: [], updatedFiles: [], skipCount: 0, fileCount: 0, totalSize: 0 }
    yield statThenExport(srcPath, dstPath)
    return stats
  }))
}

module.exports = {exportFilesystemToArchive, exportArchiveToFilesystem, exportArchiveToArchive}
