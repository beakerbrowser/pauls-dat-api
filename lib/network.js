const path = require('path')
const {NotFoundError} = require('beaker-error-constants')
const {maybe} = require('./common')
const {stat} = require('./lookup')
const {readdir} = require('./read')

// download the given file(s)
function download (archive, name, cb) {
  return maybe(cb, async function () {
    // lookup the entry
    var entry = await stat(archive, name)
    if (!entry) {
      throw new NotFoundError(`The entry ${name} was not found in the archive.`)
    }

    // recurse on a directory
    if (entry.isDirectory()) {
      let listing = await readdir(archive, name)
      let promises = listing.map(subname => download(archive, path.join(name, subname)))
      return Promise.all(promises)
    }

    // prioritize a file
    if (entry.isFile()) {
      if (entry.downloaded === entry.blocks) {
        return // already downloaded
      }
      return new Promise((resolve, reject) => {
        archive.content.download({
          start: entry.offset,
          end: entry.offset + entry.blocks
        }, err => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  })
}

module.exports = {download}
