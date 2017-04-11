const maybe = require('call-me-maybe')
const path = require('path')
const co = require('co')
const {normalizeArchive, toBeakerError, lock} = require('./common')
const {
  NotFoundError,
  NotAFileError,
  NotAFolderError,
  DestDirectoryNotEmpty,
  ArchiveNotWritableError
} = require('beaker-error-constants')
const {stat} = require('./lookup')
const {readdir} = require('./read')

function unlink (archive, name, cb) {
  return maybe(cb, co(function*() {
    archive = normalizeArchive(archive)

    // ensure we have the archive's private key
    if (!archive.writable) {
      throw new ArchiveNotWritableError()
    }

    // ensure the target location is a file
    var st
    try { st = yield stat(archive, name) }
    catch (e) {}
    if (!st) {
      throw new NotFoundError()
    }
    if (!st.isFile()) {
      throw new NotAFileError('Cannot unlink non-files')
    }

    // write
    return new Promise((resolve, reject) => {
      archive.unlink(name, err => {
        if (err) reject(toBeakerError(err, 'unlink'))
        else resolve()
      })
    })
  }))
}

function rmdir (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, co(function * () {
    archive = normalizeArchive(archive)
    opts = opts || {}
    var recursive = opts && opts.recursive

    // ensure we have the archive's private key
    if (!archive.writable) {
      throw new ArchiveNotWritableError()
    }

    // ensure the target location is a folder
    var st
    try { st = yield stat(archive, name) }
    catch (e) {}
    if (!st) {
      throw new NotFoundError()
    }
    if (!st.isDirectory()) {
      throw new NotAFolderError('Cannot rmdir non-folders')
    }

    if (recursive) {
      // TODO
      // fetch and delete all children
      // var release = yield lock(archive)
      try {
        return recurseDelete(archive, name, st)
      } finally {
        // release()
      }
    } else {
      // delete if there are no children
      var children = yield readdir(archive, name)
      if (children.length) {
        throw new DestDirectoryNotEmpty()
      }
      return new Promise((resolve, reject) => {
        archive.rmdir(name, err => {
          if (err) reject(toBeakerError(err, 'rmdir'))
          else resolve()
        })
      })
    }
  }))
}

function recurseDelete (archive, targetPath, st) {
  return co(function* () {
    // fetch stat if needed
    if (!st) {
      st = yield stat(archive, targetPath)
    }
    if (st.isFile()) {
      // delete file
      return new Promise((resolve, reject) => {
        archive.unlink(targetPath, (err) => {
          if (err) reject(toBeakerError(err, 'unlink'))
          else resolve()
        })
      })
    } else if (st.isDirectory()) {
      // fetch children
      var children = yield readdir(archive, targetPath)
      // delete children
      for (var i = 0; i < children.length; i++) {
        yield recurseDelete(archive, path.join(targetPath, children[i]))
      }
      // delete self
      return new Promise((resolve, reject) => {
        archive.rmdir(targetPath, err => {
          if (err) reject(toBeakerError(err, 'rmdir'))
          else resolve()
        })
      })
    } else {
      throw new Error('Unexpectedly encountered an entry which is neither a file or directory at', path)
    }
  })
}

module.exports = {unlink, rmdir}