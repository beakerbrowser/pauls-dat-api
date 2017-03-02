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
    if (archive.content) {
      archive.content.removeListener('have', onContentHave)
    }
  })

  // wire up events
  archive.metadata.on('update', onMetaUpdate)
  if (!archive.owner) {
    // remote archives only
    archive.open(() => {
      archive.content.on('have', onContentHave)

      // track all undownloaded files
      archive.list((err, entries) => {
        if (!entries) return
        entries.forEach(entry => {
          if (!archive.isEntryDownloaded(entry)) {
            track(entry)
          }
        })
      })
    })
  }

  // tracking helper
  function track (entry, entryPath) {
    if (!entryPath) {
      // apply filter
      entryPath = normalizeEntryName(entry)
      if (!match(path, entryPath)) {
        return
      }
    }

    // track the invalidation
    invalidatedEntries[entryPath] = {
      start: entry.content.blockOffset,
      end: entry.content.blockOffset + entry.blocks,
      entry
    }
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
          track(entry, entryPath)
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
        if (!archive.isEntryDownloaded(e.entry)) {
          return // not yet downloaded
        }
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

function createNetworkActivityStream (archive, path) {
  // options
  archive = normalizeArchive(archive)

  // create new emitter and stream
  var emitter = new EventEmitter()
  var stream = emitStream(emitter)
  stream.on('close', () => {
    // unlisten events
    archive.metadata.removeListener('peer-add', onNetworkChanged)
    archive.metadata.removeListener('peer-remove', onNetworkChanged)
    untrack(archive.metadata, handlers.metadata)
    untrack(archive.content, handlers.content)
  })

  // handlers
  function onNetworkChanged () {
    emitter.emit('network-changed', { connections: archive.metadata.peers.length })
  }
  var handlers = {
    metadata: {
      onDownloadFinished () {
        emitter.emit('download-finished', { feed: 'metadata' })
      },
      onDownload (block, data) {
        emitter.emit('download', { feed: 'metadata', block, bytes: data.length })
      },
      onUpload (block, data) {
        emitter.emit('upload', { feed: 'metadata', block, bytes: data.length })
      }
    },
    content: {
      onDownloadFinished () {
        emitter.emit('download-finished', { feed: 'content' })
      },
      onDownload (block, data) {
        emitter.emit('download', { feed: 'content', block, bytes: data.length })
      },
      onUpload (block, data) {
        emitter.emit('upload', { feed: 'content', block, bytes: data.length })
      }
    }
  }

  // initialize all trackers
  track(archive.metadata, 'metadata')
  archive.open(err => track(archive.content, 'content'))
  archive.metadata.on('peer-add', onNetworkChanged)
  archive.metadata.on('peer-remove', onNetworkChanged)
  function track (feed, name) {
    if (!feed) return
    var h = handlers[name]
    feed.on('download-finished', h.onDownloadFinished)
    feed.on('download', h.onDownload)
    feed.on('upload', h.onUpload)
  }
  function untrack (feed, handlers) {
    if (!feed) return
    feed.removeListener('download-finished', handlers.onDownloadFinished)
    feed.removeListener('download', handlers.onDownload)
    feed.removeListener('upload', handlers.onUpload)
  }

  return stream
}

module.exports = {createFileActivityStream, createNetworkActivityStream}