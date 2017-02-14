const assert = require('assert')
const maybe = require('call-me-maybe')
const co = require('co')
const pTimeout = require('p-timeout')
const {NotFoundError, TimeoutError} = require('./const')
const {normalizeArchive, normalizeEntryName} = require('./common')
const {lookupEntry} = require('./lookup')
const {listFiles} = require('./read')

// copy files from the filesystem into an archive
function download (archive, nameOrEntry, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, co(function* () {
    archive = normalizeArchive(archive)

    // options
    var timeout = (opts && typeof opts.timeout === 'number') ? opts.timeout : false
    var priority = (opts && typeof opts.priority === 'number') ? opts.priority : 3
    priority = Math.min(Math.max(1, priority), 5)

    // lookup the entry
    var entry = (typeof nameOrEntry === 'string')
      ? yield lookupEntry(archive, normalizeEntryName(nameOrEntry))
      : nameOrEntry

    if (!entry) {
      throw new NotFoundError(`The entry ${nameOrEntry} was not found in the archive.`)
    }

    // recurse on a directory
    if (entry.type === 'directory') {
      let listing = yield listFiles(archive, entry.name)
      let promises = Object.keys(listing).map(k => download(archive, listing[k]))
      let promise = Promise.all(promises)
      if (timeout) return pTimeout(promise, timeout)
      return promise
    }

    // prioritize a file
    if (entry.type === 'file') {
      // TODO
      // for some reason, hyperdrive downloads more than requested
      // so we'll need to do it ourselves
      // -prf
      // let promise = new Promise((resolve, reject) => {
      //   archive.download(entry, err => {
      //     if (err) reject(err)
      //     else resolve()
      //   })
      // })
      // if (timeout) return pTimeout(promise, timeout)
      // return promise

      return new Promise((resolve, reject) => {
        var start = entry.content.blockOffset
        var end = entry.content.blockOffset + entry.blocks
        var cleanup = () => archive.content.removeListener('download', check)

        var t = (timeout) ?
          setTimeout(() => {
            cleanup()
            reject(new TimeoutError())
          }, timeout)
          : false

        function check () {
          while (true) {
            if (start >= end) {
              if (t) clearTimeout(t)
              cleanup()
              return resolve()
            }
            if (!archive.content.has(start)) return
            start++
          }
        }

        archive.content.prioritize({start, end, priority, linear: true})
        archive.content.setMaxListeners(0)
        archive.content.on('download', check)
        check()
      })
    }
  }))
}

module.exports = {download}