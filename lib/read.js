const maybe = require('call-me-maybe')
const {wrap} = require('co')
const concat = require('concat-stream')
const path = require('path')
const {normalizeEntryName, toValidEncoding, isPathChild} = require('./common')
const {lookupEntry} = require('./lookup')
const {NotAFileError} = require('./const')

// helper to pull file data from an archive
function readFile (archive, name, opts, cb) {
  return maybe(cb, wrap(*() => {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    opts.encoding = toValidEncoding(opts.encoding)

    // find the file
    var entry = yield lookupEntry(archive, name)
    if (entry.type !== 'file') {
      throw new NotAFileError()
    }

    // read & concat the stream into a buffer
    var rs = archive.createFileReadStream(entry)
    return new Promise((resolve, reject) => {
      rs.pipe(concat(data => {
        if (opts.encoding !== 'binary') {
          // encoding conversion
          data = data.toString(opts.encoding)
        }
        resolve(data)
      }))
      rs.on('error', reject)
    })
  }))
}

// helper to list the files in a directory
function listFiles (archive, dstPath, cb) {
  return maybe(cb, new Promise(resolve => {
    var dstPathParts = dstPath.split('/')
    if (dstPathParts.length > 1 && !dstPathParts[dstPathParts.length - 1]) dstPathParts.pop() // drop the last empty ''

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
        var name = entryPathParts[dstPathParts.length]
        // child should have exactly 1 more item than the containing path
        var isImmediateChild = (entryPathParts.length === dstPathParts.length + 1)
        if (isImmediateChild) {
          entries[name] = e
        } else {
          // not an immediate child - add the directory if DNE
          if (!entries[name]) {
            entries[name] = { type: 'directory', name: path.join(dstPath, name) }
          }
        }
      }
    })

    s.on('error', lookupDone)
    s.on('close', lookupDone)
    s.on('end', lookupDone)
    function lookupDone () {
      resolve(entries)
    }
  })
}

module.exports = {readFile, listFiles}