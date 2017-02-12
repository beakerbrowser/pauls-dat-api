const maybe = require("call-me-maybe")
const co = require('co')
const {normalizeEntryName} = require('./common')

// helper to run custom lookup rules
// - `checkFn` is called with (entry). if it returns true, then `entry` is made the current match
// - if `checkFn` is a string, defaults to by-name
function lookupEntry (archive, checkFn, cb) {
  if (typeof checkFn === 'string') {
    // by-name behavior
    return lookupEntryByName(archive, checkFn, cb)
  }

  return maybe(cb, new Promise(resolve => {
    // run a linear scan on the full archive history
    var entriesStream = archive.list({live: false})
    var entry = null

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
      resolve(entry)
    }
  }))
}

// simple-case lookup, by === name
function lookupEntryByName (archive, name, cb) {
  return maybe(cb, co(function* () {
    name = normalizeEntryName({ name })
    if (name === '/') {
      // the root directory always exists, just use this hardcoded one
      return { type: 'directory', name: '/' }
    }

    // run a linear scan
    var entry = yield lookupEntry(archive, (entry, entryName) => entryName === name)
    return entry
  }))
}

module.exports = {lookupEntry}