const maybe = require('call-me-maybe')
const co = require('co')
const {normalizeArchive, normalizeEntryName} = require('./common')
const {DEFAULT_TIMEOUT, TimeoutError} = require('./const')

// helper to run custom lookup rules
// - `checkFn` is called with (entry). if it returns true, then `entry` is made the current match
// - if `checkFn` is a string, defaults to by-name
function lookupEntry (archive, checkFn, opts, cb) {
  archive = normalizeArchive(archive)
  var timeout = (opts && typeof opts.timeout === 'number') ? opts.timeout : DEFAULT_TIMEOUT
  if (typeof checkFn === 'string') {
    // by-name behavior
    return lookupEntryByName(archive, checkFn, opts, cb)
  }

  return maybe(cb, new Promise((resolve, reject) => {
    // run a linear scan on the full archive history
    var entriesStream = archive.list({live: false})
    var entry = null

    // start timeout timer
    var timedOut = false
    var timer = setTimeout(() => {
      timedOut = true
      entriesStream.destroy()
      reject(new TimeoutError())
    }, timeout)

    entriesStream.on('data', function (e) {
      // match with the check function
      if (checkFn(e, normalizeEntryName(e))) {
        entry = e
      }
    })

    entriesStream.on('error', lookupDone)
    entriesStream.on('close', lookupDone)
    entriesStream.on('end', lookupDone)
    function lookupDone () {
      clearTimeout(timer)
      if (timedOut) return // do nothing if timed out

      resolve(entry)
    }
  }))
}

// simple-case lookup, by === name
function lookupEntryByName (archive, name, opts, cb) {
  archive = normalizeArchive(archive)
  return maybe(cb, co(function* () {
    name = normalizeEntryName({ name })
    if (name === '/') {
      // the root directory always exists, just use this hardcoded one
      return { type: 'directory', name: '/' }
    }

    // run a linear scan
    var entry = yield lookupEntry(archive, (entry, entryName) => entryName === name, opts)
    return entry
  }))
}

module.exports = {lookupEntry}