const emitStream = require('emit-stream')
const EventEmitter = require('events').EventEmitter
const match = require('anymatch')
const {findEntryByContentBlock} = require('./common')

function createFileActivityStream (archive, staging, path) {
  // options
  if (staging && (Array.isArray(staging) || typeof staging === 'string')) {
    path = staging
    staging = null
  }
  path = path || ['**']
  if (typeof path === 'string') {
    path = [path]
  }

  // handle by owner status and staging usage
  if (staging && staging.isStaging) {
    return createStagingFileActivityStream(archive, staging, path)
  } else if (archive.writable) {
    return createLocalFileActivityStream(archive, path)
  } else {
    return createRemoteFileActivityStream(archive, path)
  }
}

function createStagingFileActivityStream (archive, staging, paths) {
  // create new emitter and stream
  var emitter = new EventEmitter()
  var stream = emitStream(emitter)

  // wire up events
  var stopwatch = staging.watch('/', onFileChange)
  if (!archive.writable) {
    archive.metadata.on('append', onMetaAppend)
  }
  stream.on('close', () => {
    try { stopwatch() }
    catch (e) { /* ignore - this can happen if staging's path was invalid */ }
    archive.metadata.removeListener('append', onMetaAppend)
  })

  function onMetaAppend () {
    var block = archive.metadata.length - 1
    archive.tree._getAndDecode(block, {}, (err, entry) => {
      if (err || !entry) return

      // apply path matching
      if (paths && !match(paths, entry.name)) {
        return
      }

      // emit
      emitter.emit('invalidated', {path: entry.name})
    })
  }

  function onFileChange (path) {
    // apply path matching
    if (paths && !match(paths, path)) {
      return
    }

    emitter.emit('changed', {path})
  }

  return stream
}

function createLocalFileActivityStream (archive, paths) {
  // create new emitter and stream
  var emitter = new EventEmitter()
  var stream = emitStream(emitter)

  // wire up events
  archive.metadata.on('append', onMetaAppend)
  stream.on('close', () => {
    archive.metadata.removeListener('append', onMetaAppend)
  })

  function onMetaAppend () {
    var block = archive.metadata.length - 1
    archive.tree._getAndDecode(block, {}, (err, entry) => {
      if (err || !entry) return

      // apply path matching
      if (!match(paths, entry.name)) {
        return
      }

      // local archive, just emit changed-event immediately
      emitter.emit('changed', {path: entry.name})
    })
  }

  return stream
}

function createRemoteFileActivityStream (archive, paths) {
  // create new emitter and stream
  var emitter = new EventEmitter()
  var stream = emitStream(emitter)

  // wire up events
  archive.metadata.on('download', onMetaDownload)
  if (archive.content) { wireContent() } else { archive.on('content', wireContent) }
  function wireContent () { archive.content.on('download', onContentDownload) }
  stream.on('close', () => {
    // unlisten events
    archive.metadata.removeListener('download', onMetaDownload)
    if (archive.content) {
      archive.content.removeListener('download', onContentDownload)
    }
  })

  // handlers
  function onMetaDownload (block) {
    archive.tree._getAndDecode(block, {}, (err, entry) => {
      if (err || !entry) return

      // apply path matching
      if (!match(paths, entry.name)) {
        return
      }

      // emit
      emitter.emit('invalidated', {path: entry.name})

      // check if we can emit 'changed' now
      var isChanged = false
      if (!entry.value) {
        isChanged = true // a deletion
      } else {
        var st = archive.tree._codec.decode(entry.value)
        var range = {
          start: st.offset,
          end: st.offset + st.blocks
        }
        isChanged = isDownloaded(archive, range)
      }
      if (isChanged) {
        emitter.emit('changed', {path: entry.name})
      }
    })
  }
  async function onContentDownload (block) {
    // find the entry this applies to
    var range = await findEntryByContentBlock(archive, block)

    // emit 'changed' if downloaded
    if (range && isDownloaded(archive, range)) {
      setImmediate(() => emitter.emit('changed', {path: range.name}))
    }
  }

  return stream
}

function isDownloaded (archive, range) {
  if (!archive.content || !archive.content.opened) return false
  for (var i = range.start; i < range.end; i++) {
    if (!archive.content.has(i)) return false
  }
  return true
}

function createNetworkActivityStream (archive, path) {
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
      onDownload (block, data) {
        emitter.emit('download', { feed: 'metadata', block, bytes: data.length })
      },
      onUpload (block, data) {
        emitter.emit('upload', { feed: 'metadata', block, bytes: data.length })
      },
      onSync () {
        emitter.emit('sync', { feed: 'metadata' })
      }
    },
    content: {
      onDownload (block, data) {
        emitter.emit('download', { feed: 'content', block, bytes: data.length })
      },
      onUpload (block, data) {
        emitter.emit('upload', { feed: 'content', block, bytes: data.length })
      },
      onSync () {
        emitter.emit('sync', { feed: 'content' })
      }
    }
  }

  // initialize all trackers
  track(archive.metadata, 'metadata')
  if (archive.content) track(archive.content, 'content')
  else archive.on('content', () => track(archive.content, 'content'))
  archive.metadata.on('peer-add', onNetworkChanged)
  archive.metadata.on('peer-remove', onNetworkChanged)
  function track (feed, name) {
    if (!feed) return
    var h = handlers[name]
    feed.on('download', h.onDownload)
    feed.on('upload', h.onUpload)
    feed.on('sync', h.onSync)
  }
  function untrack (feed, handlers) {
    if (!feed) return
    feed.removeListener('download', handlers.onDownload)
    feed.removeListener('upload', handlers.onUpload)
    feed.removeListener('sync', handlers.onSync)
  }

  return stream
}

module.exports = {createFileActivityStream, createNetworkActivityStream}
