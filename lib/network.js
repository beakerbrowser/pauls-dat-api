const path = require('path')
const maybe = require('call-me-maybe')
const co = require('co')
const pTimeout = require('p-timeout')
const {NotFoundError, TimeoutError} = require('beaker-error-constants')
const {normalizeArchive, normalizeEntryName} = require('./common')
const {stat} = require('./lookup')
const {readdir} = require('./read')

// download the given file(s)
function download (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, co(function* () {
    archive = normalizeArchive(archive)

    // options
    var timeout = (opts && typeof opts.timeout === 'number') ? opts.timeout : false

    // lookup the entry
    var entry = yield stat(archive, name)
    if (!entry) {
      throw new NotFoundError(`The entry ${name} was not found in the archive.`)
    }

    // recurse on a directory
    if (entry.isDirectory()) {
      let listing = yield readdir(archive, name)
      let promises = listing.map(subname => download(archive, path.join(name, subname)))
      let promise = Promise.all(promises)
      if (timeout) return pTimeout(promise, timeout)
      return promise
    }

    // prioritize a file
    if (entry.isFile()) {
      let promise = new Promise((resolve, reject) => {
        archive.content.download({
          start: entry.offset,
          end: entry.offset + entry.blocks
        }, err => {
          if (err) reject(err)
          else resolve()
        })
      })
      if (timeout) return pTimeout(promise, timeout)
      return promise
    }
  }))
}

module.exports = {download}