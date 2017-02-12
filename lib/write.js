const maybe = require('call-me-maybe')
const from2Encoding = require('from2-encoding')
const pump = require('pump')
const {toValidEncoding} = require('./common')
const {DAT_MANIFEST_FILENAME, InvalidEncodingError} = require('./const')

// helper to write file data to an archive
function writeFile (archive, name, data, opts, cb) {
  return maybe(cb, new Promise((resolve, reject) => {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    opts = opts || {}
    cb = cb || (()=>{})

    // guess the encoding by the data type
    if (!opts.encoding) {
      opts.encoding = (typeof data === 'string' ? 'utf8' : 'binary')
    }
    opts.encoding = toValidEncoding(opts.encoding)

    // validate the encoding
    if (typeof data === 'string' && opts.encoding === 'binary') {
      return reject(new InvalidEncodingError())
    }
    if (typeof data !== 'string' && opts.encoding !== 'binary') {
      return reject(new InvalidEncodingError())
    }

    // convert to buffer object
    if (opts.encoding === 'binary' && !Buffer.isBuffer(data) && Array.isArray(data.data)) {
      data = Buffer.from(data.data)
    }

    // write
    pump(
      from2Encoding(data, opts.encoding),
      archive.createFileWriteStream({ name, mtime: Date.now() }),
      err => {
        if (err) reject(err)
        else resolve()
      }
    )
  }))
}

// helper to write a directory entry to an archive
function createDirectory (archive, name, cb) {
  return maybe(cb, new Promise((resolve, reject) => {
    archive.append({
      name,
      type: 'directory',
      mtime: Date.now()
    }, err => {
      if (err) reject(err)
      else resolve()
    })
  }))
}

module.exports = {writeFile, createDirectory}