const maybe = require('call-me-maybe')
const co = require('co')
const {TimeoutError} = require('beaker-error-constants')
const {normalizeArchive, toBeakerError} = require('./common')
const {DEFAULT_TIMEOUT} = require('./const')

// lookup information about a file
function stat (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  archive = normalizeArchive(archive)
  var timeout = (opts && typeof opts.timeout === 'number') ? opts.timeout : DEFAULT_TIMEOUT
  return maybe(cb, new Promise((resolve, reject) => {
    // start timeout timer
    var timedOut = false
    var timer = setTimeout(() => {
      timedOut = true
      reject(new TimeoutError())
    }, timeout)

    // run stat operation
    archive.stat(name, (err, st) => {
      if (timedOut) return
      clearTimeout(timer)
      if (err) reject(toBeakerError(err, 'stat'))
      else {
        // read download status
        st.downloaded = 0
        if (archive.content && archive.content.length) {
          for (var i = st.offset; i < st.offset + st.blocks; i++) {
            if (archive.content.has(i)) {
              st.downloaded++
            }
          }
        }
        resolve(st)
      }
    })
  }))
}

module.exports = {stat}