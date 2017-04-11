const maybe = require('call-me-maybe')
const path = require('path')
const co = require('co')
const {normalizeArchive, toBeakerError, toValidEncoding} = require('./common')
const {DAT_MANIFEST_FILENAME, VALID_PATH_REGEX} = require('./const')
const {
  InvalidEncodingError,
  InvalidPathError,
  ArchiveNotWritableError,
  EntryAlreadyExistsError,
  ParentFolderDoesntExistError
} = require('beaker-error-constants')
const {stat} = require('./lookup')

// helper to write file data to an archive
function writeFile (archive, name, data, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, co(function*() {
    archive = normalizeArchive(archive)
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    opts = opts || {}
    cb = cb || (()=>{})

    // ensure we have the archive's private key
    if (!archive.writable) {
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
    try { existingEntry = yield stat(archive, name) }
    catch (e) {}
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
      try { parentEntry = yield stat(archive, parentName) }
      catch (e) {}
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
    if (typeof data === 'string' && opts.encoding === 'binary') {
      throw new InvalidEncodingError()
    }
    if (typeof data !== 'string' && opts.encoding !== 'binary') {
      throw new InvalidEncodingError()
    }

    // write
    return new Promise((resolve, reject) => {
      archive.writeFile(name, data, opts, err => {
        if (err) reject(toBeakerError(err, 'writeFile'))
        else resolve()
      })
    })
  }))
}

// helper to write a directory entry to an archive
function mkdir (archive, name, cb) {
  return maybe(cb, co(function * () {
    archive = normalizeArchive(archive)

    // ensure we have the archive's private key
    if (!archive.writable) {
      throw new ArchiveNotWritableError()
    }

    // ensure the target path is valid
    if (!VALID_PATH_REGEX.test(name)) {
      throw new InvalidPathError('Path contains invalid characters')
    }

    // ensure the target location is writable
    var existingEntry
    try { existingEntry = yield stat(archive, name) }
    catch (e) {}
    if (name === '/' || existingEntry) {
      throw new EntryAlreadyExistsError('Cannot overwrite files or folders')
    }

    // ensure that the parent directory exists
    var parentName = path.dirname(name)
    if (parentName !== '/' && parentName !== '.') {
      var parentEntry
      try { parentEntry = yield stat(archive, parentName) }
      catch (e) {}
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
  }))
}

module.exports = {writeFile, mkdir}