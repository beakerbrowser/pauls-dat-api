const path = require('path')
const pump = require('pump')
const {maybe, toBeakerError, toValidEncoding} = require('./common')
const {VALID_PATH_REGEX} = require('./const')
const {
  InvalidEncodingError,
  InvalidPathError,
  ArchiveNotWritableError,
  EntryAlreadyExistsError,
  ParentFolderDoesntExistError
} = require('beaker-error-constants')
const {stat} = require('./lookup')
const {readdir} = require('./read')
const {unlink, rmdir} = require('./delete')

function writeFile (archive, name, data, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, async function () {
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    opts = opts || {}

    // ensure we have the archive's private key
    if (archive.key && !archive.writable) {
      throw new ArchiveNotWritableError()
    }

    // ensure the target path is valid
    if (name.slice(-1) === '/') {
      throw new InvalidPathError('Files can not have a trailing slash')
    }
    if (!VALID_PATH_REGEX.test(name)) {
      throw new InvalidPathError('Path contains invalid characters')
    }

    // ensure the target location is writable
    var existingEntry
    try { existingEntry = await stat(archive, name) } catch (e) {}
    if (existingEntry && !existingEntry.isFile()) {
      throw new EntryAlreadyExistsError('Cannot overwrite non-files')
    }

    // copy ctime from the existing entry
    if (existingEntry) {
      opts.ctime = existingEntry.ctime
    }

    // ensure that the parent directory exists
    var parentName = path.dirname(name)
    if (parentName !== '/' && parentName !== '.') {
      var parentEntry
      try { parentEntry = await stat(archive, parentName) } catch (e) {}
      if (!parentEntry || !parentEntry.isDirectory()) {
        throw new ParentFolderDoesntExistError()
      }
    }

    // guess the encoding by the data type
    if (!opts.encoding) {
      opts.encoding = (typeof data === 'string' ? 'utf8' : 'binary')
    }
    opts.encoding = toValidEncoding(opts.encoding)

    // validate the encoding
    if (typeof data === 'string' && !opts.encoding) {
      throw new InvalidEncodingError()
    }
    if (typeof data !== 'string' && opts.encoding) {
      throw new InvalidEncodingError()
    }

    // write
    return new Promise((resolve, reject) => {
      archive.writeFile(name, data, opts, err => {
        if (err) reject(toBeakerError(err, 'writeFile'))
        else resolve()
      })
    })
  })
}

function mkdir (archive, name, cb) {
  return maybe(cb, async function () {
    // ensure we have the archive's private key
    if (archive.key && !archive.writable) {
      throw new ArchiveNotWritableError()
    }

    // ensure the target path is valid
    if (!VALID_PATH_REGEX.test(name)) {
      throw new InvalidPathError('Path contains invalid characters')
    }

    // ensure the target location is writable
    var existingEntry
    try { existingEntry = await stat(archive, name) } catch (e) {}
    if (name === '/' || existingEntry) {
      throw new EntryAlreadyExistsError('Cannot overwrite files or folders')
    }

    // ensure that the parent directory exists
    var parentName = path.dirname(name)
    if (parentName !== '/' && parentName !== '.') {
      var parentEntry
      try { parentEntry = await stat(archive, parentName) } catch (e) {}
      if (!parentEntry || !parentEntry.isDirectory()) {
        throw new ParentFolderDoesntExistError()
      }
    }

    return new Promise((resolve, reject) => {
      archive.mkdir(name, err => {
        if (err) reject(toBeakerError(err, 'mkdir'))
        else resolve()
      })
    })
  })
}

function copy (archive, oldName, newName, cb) {
  return maybe(cb, async function () {
    // ensure we have the archive's private key
    if (archive.key && !archive.writable) {
      throw new ArchiveNotWritableError()
    }

    // ensure the target path is valid
    if (!VALID_PATH_REGEX.test(newName)) {
      throw new InvalidPathError('Path contains invalid characters')
    }

    // ensure that the target path is not a child of the source
    if (newName === oldName || newName.startsWith(oldName + '/')) {
      throw new InvalidPathError('Cannot move or copy a folder to a destination within itself') // that's some existential shit man
    }

    // ensure that the parent directory exists
    var parentName = path.dirname(newName)
    if (parentName !== '/' && parentName !== '.') {
      var parentEntry
      try { parentEntry = await stat(archive, parentName) } catch (e) {}
      if (!parentEntry || !parentEntry.isDirectory()) {
        throw new ParentFolderDoesntExistError()
      }
    }

    // do copy
    await recurseCopy(archive, oldName, newName)
  })
}

function rename (archive, oldName, newName, cb) {
  return maybe(cb, async function () {
    // ensure the target location is writable
    var existingEntry
    try { existingEntry = await stat(archive, newName) } catch (e) {}
    if (newName === '/' || existingEntry) {
      throw new EntryAlreadyExistsError('Cannot overwrite files or folders')
    }

    // copy the files over
    await copy(archive, oldName, newName)

    // delete the old files
    var st = await stat(archive, oldName)
    if (st.isDirectory()) {
      await rmdir(archive, oldName, {recursive: true})
    } else {
      await unlink(archive, oldName)
    }
  })
}

module.exports = {writeFile, mkdir, copy, rename}

// helpers
// =

function safeStat (archive, path) {
  return stat(archive, path).catch(_ => undefined)
}

async function recurseCopy (archive, sourcePath, targetPath) {
  // fetch stats
  var [sourceStat, targetStat] = await Promise.all([
    stat(archive, sourcePath),
    safeStat(archive, targetPath)
  ])

  if (targetStat) {
    if (sourceStat.isFile() && !targetStat.isFile()) {
      // never allow this
      throw new EntryAlreadyExistsError(`Cannot copy a file onto a folder (${targetPath})`)
    }
    if (!sourceStat.isFile() && targetStat.isFile()) {
      // never allow this
      throw new EntryAlreadyExistsError(`Cannot copy a folder onto a file (${targetPath})`)
    }
  } else {
    if (sourceStat.isDirectory()) {
      // make directory
      await mkdir(archive, targetPath)
    }
  }

  if (sourceStat.isFile()) {
    // copy file
    return new Promise((resolve, reject) => {
      pump(
        archive.createReadStream(sourcePath),
        archive.createWriteStream(targetPath),
        err => {
          if (err) reject(toBeakerError(err, 'createReadStream/createWriteStream'))
          else resolve()
        }
      )
    })
  } else if (sourceStat.isDirectory()) {
    // copy children
    var children = await readdir(archive, sourcePath)
    for (var i = 0; i < children.length; i++) {
      await recurseCopy(
        archive,
        path.join(sourcePath, children[i]),
        path.join(targetPath, children[i])
      )
    }
  } else {
    throw new Error('Unexpectedly encountered an entry which is neither a file or directory at', path)
  }
}
