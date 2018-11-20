const callMeMaybe = require('call-me-maybe')
const {NotFoundError, DestDirectoryNotEmpty} = require('beaker-error-constants')

function toBeakerError (err, info) {
  if (err.notFound || err.code === 'ENOENT' || err.code === 'ENOTDIR') {
    return new NotFoundError()
  } else if (err.toString().indexOf('Directory is not empty') !== -1) {
    return new DestDirectoryNotEmpty()
  } else {
    // TODO cover all error types
    console.error(`Pauls-Dat-API: Unhandled error type from ${info}`, err)
    return new Error('Unexpected error: ' + err.toString())
  }
}

// helper to convert an encoding to something acceptable
function toValidEncoding (str) {
  if (!str) return 'utf8'
  if (!['utf8', 'utf-8', 'hex', 'base64'].includes(str)) return undefined
  return str
}

// helper to call promise-generating function
function maybe (cb, p) {
  if (typeof p === 'function') {
    p = p()
  }
  return callMeMaybe(cb, p)
}

async function findEntryByContentBlock (archive, block) {
  if (archive.metadata.length <= 0) {
    return
  }

  // do a binary search
  var lo = 1
  var hi = archive.metadata.length
  const nextCursor = () => ((hi + lo) / 2) | 0
  var cursor = nextCursor()
  while (lo <= hi) {

    // find a file entry in the current [lo, hi] range
    let entry
    let st
    let origCursor = cursor
    while (true) {
      // fetch the entry
      entry = await new Promise(resolve =>
        archive.tree._getAndDecode(cursor, {}, (err, entry) => {
          if (err) console.warn('Failed to fetch block', block, err)
          resolve(entry)
        })
      )
      if (!entry) {
        return // read error, abort
      }
      if (entry.value) {
        st = archive.tree._codec.decode(entry.value)
        if (st.blocks !== 0) {
          break // found a file
        }
      }
      cursor++
      if (cursor > hi) cursor = lo // overflow back to lo
      if (cursor === origCursor) {
        return // no files in the current [lo, hi] range, not found
      }
    }

    // check the range
    let range = {
      name: entry.name,
      start: st.offset,
      end: st.offset + st.blocks - 1
    }
    if (block >= range.start && block <= range.end) {
      // found
      return range
    }

    // adjust range and try again
    if (block > range.end) {
      lo = cursor + 1
    } else {
      hi = cursor - 1
    }
    cursor = nextCursor()
  }
}

function tonix (str) {
  return str.replace(/\\/g, '/')
}

module.exports = {
  findEntryByContentBlock,
  toBeakerError,
  toValidEncoding,
  maybe,
  tonix
}
