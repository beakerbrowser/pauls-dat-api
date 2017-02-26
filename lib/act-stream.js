const emitStream = require('emit-stream')
const EventEmitter = require('events').EventEmitter
const match = require('anymatch')
const {normalizeArchive, normalizeEntryName} = require('./common')

function createFileActivityStream (archive, path) {
  // options
  archive = normalizeArchive(archive)
  path = path || ['**']
  if (typeof path === 'string') {
    path = [normalizeEntryName(path)]
  }

  // create new emitter and stream
  var invalidatedEntries = {} // map of name -> {start:,end:}
  var emitter = new EventEmitter()
  var stream = emitStream(emitter)
  stream.on('close', () => {
    // unlisten events
    archive.metadata.removeListener('update', onMetaUpdate)
    archive.content.removeListener('have', onContentHave)
  })

  // wire up events
  archive.metadata.on('update', onMetaUpdate)
  if (!archive.owner) {
    archive.open(() => {
      archive.content.on('have', onContentHave)
    })
  }

  // handlers
  function onMetaUpdate () {
    var block = archive.metadata.blocks - 2
    // -2 = (-1 for the index block, -1 because .blocks is a count)
    archive.get(block, (err, entry) => {
      if (!entry) return

      // apply path matching
      var entryPath = normalizeEntryName(entry)
      if (!match(path, entryPath)) {
        return
      }

      if (archive.owner) {
        // local archive, just emit changed directly (invalidated is not interesting)
        emitter.emit('changed', {path: entryPath})
      } else {
        // remote archive, emit 'invalidated' and track it
        emitter.emit('invalidated', {path: entryPath})
        if (archive.isEntryDownloaded(entry)) {
          // emit changed event now
          emitter.emit('changed', {path: entryPath})
        } else {
          // track the invalidation
          invalidatedEntries[entryPath] = {
            start: entry.content.blockOffset,
            end: entry.content.blockOffset + entry.blocks
          }
        }
      }
    })
  }
  function onContentHave (block) {
    // find the entry this applies to
    var entryPath
    for (var name in invalidatedEntries) {
      let e = invalidatedEntries[name]
      if (block >= e.start && block < e.end) {
        entryPath = name
        delete invalidatedEntries[name]
        break
      }
    }
    if (entryPath) {
      emitter.emit('changed', {path: entryPath})
    }
  }

  return stream
}

module.exports = {createFileActivityStream}