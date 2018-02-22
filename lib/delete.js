const path = require('path')
const {maybe, toBeakerError} = require('./common')
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
  return maybe(cb, async function () {
    // ensure we have the archive's private key
    if (archive.key && !archive.writable) {
      throw new ArchiveNotWritableError()
    }

    // ensure the target location is a file
    var st
    try { st = await stat(archive, name) } catch (e) {}
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
  })
}

function rmdir (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, async function () {
    opts = opts || {}
    var recursive = opts && opts.recursive

    // ensure we have the archive's private key
    if (archive.key && !archive.writable) {
      throw new ArchiveNotWritableError()
    }

    // ensure the target location is a folder
    var st
    try { st = await stat(archive, name) } catch (e) {}
    if (!st) {
      throw new NotFoundError()
    }
    if (!st.isDirectory()) {
      throw new NotAFolderError('Cannot rmdir non-folders')
    }

    if (recursive) {
      // TODO
      // fetch and delete all children
      // var release = await lock(archive)
      try {
        return recurseDelete(archive, name, st)
      } finally {
        // release()
      }
    } else {
      // delete if there are no children
      var children = await readdir(archive, name)
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
  })
}

async function recurseDelete (archive, targetPath, st) {

  // fetch stat if needed
  if (!st) {
    st = await stat(archive, targetPath)
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
    var children = await readdir(archive, targetPath)
    // delete children
    for (var i = 0; i < children.length; i++) {
      await recurseDelete(archive, path.join(targetPath, children[i]))
    }
    // delete self
    return new Promise((resolve, reject) => {
      archive.rmdir(targetPath, err => {
        // FIXME
        // there's a hyperdrive bug that causes empty dirs to register as NotFound
        // https://github.com/mafintosh/append-tree/issues/6
        // if (err) reject(toBeakerError(err, 'rmdir'))
        // else resolve()
        if (err) {
          console.warn('rmdir issue (append-tree#6)', err)
        }
        resolve()
      })
    })
  } else {
    throw new Error('Unexpectedly encountered an entry which is neither a file or directory at', path)
  }
}

module.exports = {unlink, rmdir}
