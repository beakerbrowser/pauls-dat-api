const maybe = require('call-me-maybe')
const co = require('co')
const {normalizeArchive, toBeakerError} = require('./common')

// lookup information about a file
function stat (archive, name, cb) {
  archive = normalizeArchive(archive)
  return maybe(cb, new Promise((resolve, reject) => {
    // run stat operation
    archive.stat(name, (err, st) => {
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