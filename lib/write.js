const maybe = require('call-me-maybe')
const path = require('path')
const co = require('co')
const from2Encoding = require('from2-encoding')
const pump = require('pump')
const {normalizeArchive, normalizeEntryName, toValidEncoding} = require('./common')
const {
  DAT_MANIFEST_FILENAME,
  VALID_PATH_REGEX,
  InvalidEncodingError,
  InvalidPathError,
  ArchiveNotWritableError,
  EntryAlreadyExistsError,
  ParentFolderDoesntExistError
} = require('./const')
const {lookupEntry} = require('./lookup')

// helper to write file data to an archive
function writeFile (archive, name, data, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, co(function*() {
    archive = normalizeArchive(archive)
    name = normalizeEntryName(name)
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    opts = opts || {}
    cb = cb || (()=>{})

    // ensure we have the archive's private key
    if (!archive.owner) {
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
    var existingEntry = yield lookupEntry(archive, name)
    if (existingEntry && existingEntry.type === 'directory') {
      throw new EntryAlreadyExistsError('Cannot overwrite folders')
    }

    // ensure that the parent directory exists
    var parentEntry = yield lookupEntry(archive, path.dirname(name))
    if (!parentEntry || parentEntry.type !== 'directory') {
      throw new ParentFolderDoesntExistError()
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

    // convert to buffer object
    if (opts.encoding === 'binary' && !Buffer.isBuffer(data) && Array.isArray(data.data)) {
      data = Buffer.from(data.data)
    }

    // write
    return new Promise((resolve, reject) => {
      pump(
        from2Encoding(data, opts.encoding),
        archive.createFileWriteStream({ name, mtime: Date.now() }),
        err => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
  }))
}

// helper to write a directory entry to an archive
function createDirectory (archive, name, cb) {
  return maybe(cb, co(function * () {
    archive = normalizeArchive(archive)

    // ensure we have the archive's private key
    if (!archive.owner) {
      throw new ArchiveNotWritableError()
    }

    // ensure the target path is valid
    if (!VALID_PATH_REGEX.test(name)) {
      throw new InvalidPathError('Path contains invalid characters')
    }

    // ensure the target location is writable
    var existingEntry = yield lookupEntry(archive, name)
    if (existingEntry && existingEntry.type !== 'directory') {
      throw new EntryAlreadyExistsError('Cannot overwrite files')
    }

    // ensure that the parent directory exists
    var parentEntry = yield lookupEntry(archive, path.dirname(name))
    if (!parentEntry || parentEntry.type !== 'directory') {
      throw new ParentFolderDoesntExistError()
    }
  
    return new Promise((resolve, reject) => {
      archive.append({
        name,
        type: 'directory',
        mtime: Date.now()
      }, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }))
}

module.exports = {writeFile, createDirectory}