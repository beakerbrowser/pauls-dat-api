const path = require('path')
const {NotAFileError} = require('beaker-error-constants')
const {maybe, toBeakerError, toValidEncoding} = require('./common')
const {stat} = require('./lookup')

// helper to pull file data from an archive
function readFile (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, async function () {
    opts = opts || {}
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    opts.encoding = toValidEncoding(opts.encoding)

    // check that it's a file
    const st = await stat(archive, name)
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
  })
}

// helper to list the files in a directory
function readdir (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  opts = opts || {}

  return maybe(cb, async function () {
    // options
    var recursive = (opts && !!opts.recursive)

    // run first readdir
    var promise = new Promise((resolve, reject) => {
      archive.readdir(name, (err, names) => {
        if (err) reject(toBeakerError(err, 'readdir'))
        else resolve(names)
      })
    })
    var results = await promise

    // recurse if requested
    if (recursive) {
      var rootPath = name
      const readdirSafe = name => new Promise(resolve => {
        archive.readdir(name, (_, names) => resolve(names || []))
      })
      const recurse = async function (names, parentPath) {
        await Promise.all(names.map(async function (name) {
          var thisPath = path.join(parentPath, name)
          var subnames = await readdirSafe(thisPath)
          await recurse(subnames, thisPath)
          results = results.concat(subnames.map(subname => normalize(rootPath, thisPath, subname)))
        }))
      }
      await recurse(results, name)
    }
    return results
  })
}

function readSize (archive, name, cb) {
  return maybe(cb, async function () {
    // stat the target
    const st = await stat(archive, name)

    // leaf
    if (st.isFile()) {
      return st.size
    }

    // list files
    const children = await readdir(archive, name)

    // recurse
    var size = 0
    for (let i = 0; i < children.length; i++) {
      size += await readSize(archive, path.join(name, children[i]))
    }
    return size
  })
}

function normalize (rootPath, parentPath, subname) {
  var str = path.join(parentPath, subname).slice(rootPath.length)
  if (str.charAt(0) === '/') return str.slice(1)
  return str
}

module.exports = {readFile, readdir, readSize}
