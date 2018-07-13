const {maybe, toBeakerError} = require('./common')

// lookup information about a file
function stat (archive, name, cb) {
  return maybe(cb, new Promise((resolve, reject) => {
    // run stat operation
    archive.stat(name, (err, st) => {
      if (err) reject(toBeakerError(err, 'stat'))
      else {
        // read download status
        st.downloaded = 0
        if (!archive.key) {
          // fs, not an archive
          st.downloaded = st.blocks
        } else if (st.isFile()) {
          if (archive.content && archive.content.length) {
            st.downloaded = archive.content.downloaded(st.offset, st.offset + st.blocks)
          }
        }
        resolve(st)
      }
    })
  }))
}

module.exports = {stat}
