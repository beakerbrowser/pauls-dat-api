const maybe = require('call-me-maybe')
const concat = require('concat-stream')
const path = require('path')
const {NotFoundError, NotAFileError, TimeoutError} = require('beaker-error-constants')
const {normalizeArchive, normalizeEntryName, toValidEncoding, isPathChild} = require('./common')
const {lookupEntry} = require('./lookup')
const {DEFAULT_TIMEOUT} = require('./const')

// helper to pull file data from an archive
function readFile (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, new Promise((resolve, reject) => {
    archive = normalizeArchive(archive)
    name = normalizeEntryName(name)
    opts = opts || {}
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    opts.encoding = toValidEncoding(opts.encoding)

    // start timeout timer
    var entriesStream, readStream
    var timeout = (opts && typeof opts.timeout === 'number') ? opts.timeout : DEFAULT_TIMEOUT
    var timedOut = false
    var timer = setTimeout(() => {
      timedOut = true
      if (entriesStream) entriesStream.destroy()
      if (readStream) readStream.destroy()
      reject(new TimeoutError())
    }, timeout)

    // find the file
    // run a linear scan on the full archive history
    // NOTE I cant reuse lookupEntry because it has its own timeout mechanism -prf
    entriesStream = archive.list({live: false})
    var entry = null

    entriesStream.on('data', function (e) {
      // match with the check function
      if (normalizeEntryName(e) === name) {
        entry = e
      }
    })

    entriesStream.on('error', lookupDone)
    entriesStream.on('close', lookupDone)
    entriesStream.on('end', lookupDone)
    function lookupDone () {
      entriesStream = null
      if (timedOut) return // do nothing if timed out
      if (!entry) {
        return reject(new NotFoundError())
      }
      if (entry.type !== 'file') {
        return reject(new NotAFileError())
      }

      // read & concat the stream into a buffer
      readStream = archive.createFileReadStream(entry)
      readStream.pipe(concat(data => {
        readStream = null
        clearTimeout(timer)
        if (timedOut) return // do nothing if timed out

        if (opts.encoding !== 'binary') {
          // encoding conversion
          data = data.toString(opts.encoding)
        }
        resolve(data)
      }))
      readStream.on('error', reject)
    }
  }))
}

// helper to list the files in a directory
function listFiles (archive, dstPath, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  opts = opts || {} 

  return maybe(cb, new Promise(resolve => {
    archive = normalizeArchive(archive)
    dstPath = normalizeEntryName(dstPath)
    var dstPathParts = dstPath.split('/')
    if (dstPathParts.length > 1 && !dstPathParts[dstPathParts.length - 1]) dstPathParts.pop() // drop the last empty ''

    // options
    var depth = (typeof opts.depth === 'undefined') ? 1 : opts.depth
    if (depth < 0) depth = 0
    if (depth && typeof depth !== 'number') depth = 1

    // start a list stream
    var s = archive.list({live: false})
    var entries = {}

    s.on('data', function (e) {
      // check if the entry is a child of the given path
      var entryPath = normalizeEntryName(e)
      var entryPathParts = entryPath.split('/')
      if (entryPathParts.length > 1 && !entryPathParts[entryPathParts.length - 1]) entryPathParts.pop() // drop the last empty ''
      if (entryPathParts.length !== dstPathParts.length && isPathChild(dstPathParts, entryPathParts)) {
        // use the subname
        var name = entryPathParts.slice(dstPathParts.length).join('/')
        // apply depth test
        var shouldInclude = !depth || (
          entryPathParts.length > dstPathParts.length &&
          entryPathParts.length <= (dstPathParts.length + depth)
        )
        if (shouldInclude) {
          entries[name] = e
        }
      }
    })

    s.on('error', lookupDone)
    s.on('close', lookupDone)
    s.on('end', lookupDone)
    function lookupDone () {
      resolve(entries)
    }
  }))
}

module.exports = {readFile, listFiles}