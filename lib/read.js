const maybe = require('call-me-maybe')
const co = require('co')
const path = require('path')
const {NotAFileError} = require('beaker-error-constants')
const {toBeakerError, toValidEncoding} = require('./common')
const {stat} = require('./lookup')

// helper to pull file data from an archive
function readFile (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, co(function* () {
    opts = opts || {}
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    opts.encoding = toValidEncoding(opts.encoding)

    // check that it's a file
    const st = yield stat(archive, name)
    if (!st.isFile()) {
      throw new NotAFileError()
    }

    // read the file
    return new Promise((resolve, reject) => {
      archive.readFile(name, opts, (err, data) => {
        if (err) reject(toBeakerError(err, 'readFile'))
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
    var recursive = (opts && !!opts.recursive)

    // run first readdir
    var promise = new Promise((resolve, reject) => {
      archive.readdir(name, (err, names) => {
        if (err) reject(toBeakerError(err, 'readdir'))
        else resolve(names)
      })
    })
    var results = yield promise

    // recurse if requested
    if (recursive) {
      var rootPath = name
      const readdirSafe = name => new Promise(resolve => {
        archive.readdir(name, (_, names) => resolve(names || []))
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

function readSize (archive, name, cb) {
  return maybe(cb, co(function* () {
    // stat the target
    const st = yield stat(archive, name)

    // leaf
    if (st.isFile()) {
      return st.size
    }

    // list files
    const children = yield readdir(archive, name)

    // recurse
    var size = 0
    for (let i = 0; i < children.length; i++) {
      size += yield readSize(archive, path.join(name, children[i]))
    }
    return size
  }))  
}

function normalize (rootPath, parentPath, subname) {
  var str = path.join(parentPath, subname).slice(rootPath.length)
  if (str.charAt(0) === '/') return str.slice(1)
  return str
}

module.exports = {readFile, readdir, readSize}
