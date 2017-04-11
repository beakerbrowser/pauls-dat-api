const co = require('co')
const emitStream = require('emit-stream')
const EventEmitter = require('events').EventEmitter
const match = require('anymatch')
const {normalizeArchive} = require('./common')
const {stat} = require('./lookup')
const {readdir} = require('./read')

function createFileActivityStream (archive, path) {
  // options
  archive = normalizeArchive(archive)
  path = path || ['**']
  if (typeof path === 'string') {
    path = [path]
  }

  // handle by owner status
  if (archive.writable) {
    return createLocalFileActivityStream(archive, path)
  } else {
    return createRemoteFileActivityStream(archive, path)
  }
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
    archive.tree._getAndDecode(block, (err, entry) => {
      if (!entry) return

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
  archive.ready(() => archive.content.on('download', onContentDownload))
  stream.on('close', () => {
    // unlisten events
    archive.metadata.removeListener('download', onMetaDownload)
    if (archive.content) {
      archive.content.removeListener('download', onContentDownload)
    }
  })

  // populate the invalidated ranges
  var invalidatedRanges = {}
  archive.ready(co.wrap(function* () {
    var files = yield readdir(archive, '/', {recursive: true})
    for (var i = 0; i < files.length; i++) {
      let stat = yield stat(archive, files[i])
      if (stat.downloaded < stat.blocks) {
        invalidatedRanges['/' + files[i]] = {
          start: stat.offset,
          end: stat.offset + stat.blocks
        }
      }
    }
  }))

  // handlers
  function onMetaDownload (block) {
    archive.tree._getAndDecode(block, (err, entry) => {
      if (!entry) return

      // apply path matching
      if (!match(paths, entry.name)) {
        return
      }

      // emit
      emitter.emit('invalidated', {path: entry.name})

      // check if we can emit 'changed' now
      var stat = archive.tree._codec.decode(entry.value)
      var range = {
        start: stat.offset,
        end: stat.offset + stat.blocks
      }
      if (isDownloaded(archive, range)) {
        emitter.emit('changed', {path: entry.name})        
      } else {
        // track the entry
        invalidatedRanges[entry.name] = range
      }
    })
  }
  function onContentDownload (block) {
    // find the range this applies to
    for (var name in invalidatedRanges) {
      let range = invalidatedRanges[name]
      if (block >= range.start && block < range.end) {
        if (!isDownloaded(archive, range)) {
          return // not yet downloaded
        }
        delete invalidatedRanges[name]
        emitter.emit('changed', {path: name})
        return
      }
    }
  }

  return stream
}

function isDownloaded (archive, range) {
  for (var i = range.start; i < range.end; i++) {
    if (!archive.content.has(i)) return false
  }
  return true
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
      onDownload (block, data) {
        emitter.emit('download', { feed: 'metadata', block, bytes: data.length })
      },
      onUpload (block, data) {
        emitter.emit('upload', { feed: 'metadata', block, bytes: data.length })
      }
    },
    content: {
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
  archive.on('content', () => track(archive.content, 'content'))
  archive.metadata.on('peer-add', onNetworkChanged)
  archive.metadata.on('peer-remove', onNetworkChanged)
  function track (feed, name) {
    if (!feed) return
    var h = handlers[name]
    feed.on('download', h.onDownload)
    feed.on('upload', h.onUpload)
  }
  function untrack (feed, handlers) {
    if (!feed) return
    feed.removeListener('download', handlers.onDownload)
    feed.removeListener('upload', handlers.onUpload)
  }

  return stream
}

module.exports = {createFileActivityStream, createNetworkActivityStream}