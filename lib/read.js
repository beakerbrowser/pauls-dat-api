const maybe = require('call-me-maybe')
const co = require('co')
const pTimeout = require('p-timeout')
const concat = require('concat-stream')
const path = require('path')
const {NotAFileError, TimeoutError} = require('beaker-error-constants')
const {normalizeArchive, toBeakerError, toValidEncoding} = require('./common')
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
    opts = opts || {}
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    opts.encoding = toValidEncoding(opts.encoding)

    // start timeout timer
    var timeout = (opts && typeof opts.timeout === 'number') ? opts.timeout : DEFAULT_TIMEOUT
    var timedOut = false
    var timer = setTimeout(() => {
      timedOut = true
      reject(new TimeoutError())
    }, timeout)

    // check that it's a file
    archive.stat(name, (err, st) => {
      if (timedOut) return // do nothing if timed out
      clearTimeout(timer)

      if (err) {
        return reject(toBeakerError(err, 'stat'))
      }
      else if (!st.isFile()) {
        return reject(new NotAFileError())
      }

      // read the file
      archive.readFile(name, opts, (err, data) => {
        if (timedOut) return // do nothing if timed out
        clearTimeout(timer)
        if (err) {
        }
        else resolve(data)
      })
    })
  }))
}

// helper to list the files in a directory
function readdir (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  opts = opts || {} 

  return maybe(cb, co(function* () {
    // options
    archive = normalizeArchive(archive)
    var timeout = (opts && typeof opts.timeout === 'number') ? opts.timeout : DEFAULT_TIMEOUT
    var recursive = (opts && !!opts.recursive)

    // run first readdir
    var promise = new Promise((resolve, reject) => {
      archive.readdir(name, (err, names) => {
        if (err) reject(toBeakerError(err, 'readdir'))
        else resolve(names)
      })      
    })
    promise = pTimeout(promise, timeout)
    var results = yield promise

    // recurse if requested
    if (recursive) {
      var rootPath = name
      const readdirSafe = name => new Promise(resolve => {
        archive.readdir(name, (err, names) => resolve(names))
      }) 
      const recurse = co.wrap(function* (names, parentPath) {
        yield Promise.all(names.map(co.wrap(function* (name) {
          var thisPath = path.join(parentPath, name)
          var subnames = yield readdirSafe(thisPath)
          yield recurse(subnames, thisPath)
          results = results.concat(subnames.map(subname => normalize(rootPath, thisPath, subname)))
        })))
      })
      yield recurse(results, name)
    }
    return results
  }))
}

function normalize (rootPath, parentPath, subname) {
  var str = path.join(parentPath, subname).slice(rootPath.length)
  if (str.charAt(0) === '/') return str.slice(1)
  return str
}

module.exports = {readFile, readdir}