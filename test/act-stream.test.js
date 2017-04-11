const test = require('ava')
const hyperdrive = require('hyperdrive')
const tutil = require('./util')
const pda = require('../index')

async function contentEvent (archive) {
  return new Promise(resolve => {
    archive.on('content', resolve)
  })
}

test('createFileActivityStream local', async t => {
  var archive
  var changes

  // no pattern
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  var stream = pda.createFileActivityStream(archive)

  changes = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
  stream.on('data', ([event, args]) => {
    t.deepEqual(event, 'changed')
    t.deepEqual(args.path, changes.shift())
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')

  // simple pattern
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  var stream = pda.createFileActivityStream(archive, '/a.txt')

  changes = ['/a.txt', '/a.txt', '/a.txt']
  stream.on('data', ([event, args]) => {
    t.deepEqual(event, 'changed')
    t.deepEqual(args.path, changes.shift())
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')

  // complex pattern
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  var stream = pda.createFileActivityStream(archive, ['/a.txt', '/c.txt'])

  changes = ['/a.txt', '/a.txt', '/a.txt', '/c.txt']
  stream.on('data', ([event, args]) => {
    t.deepEqual(event, 'changed')
    t.deepEqual(args.path, changes.shift())
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')

  // glob
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  var stream = pda.createFileActivityStream(archive, '/*.txt')

  changes = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
  stream.on('data', ([event, args]) => {
    t.deepEqual(event, 'changed')
    t.deepEqual(args.path, changes.shift())
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')
})

test('createFileActivityStream remote sparse', async t => {
  var archive

  // no pattern
  // =

  const src = await tutil.createArchive()
  await new Promise(resolve => src.ready(resolve))
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: true})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  var stream = pda.createFileActivityStream(dst)

  // invalidation phase

  var invalidates = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
  var changes = ['/a.txt', '/c.txt', '/b.txt']
  stream.on('data', ([event, args]) => {
    if (event === 'invalidated') {
      t.deepEqual(args.path, invalidates.shift())
    } else if (event === 'changed'){
      t.deepEqual(args.path, changes.shift())
    }
  })

  await pda.writeFile(src, 'a.txt', 'one', 'utf8')
  await pda.writeFile(src, 'b.txt', 'one', 'utf8')
  await pda.writeFile(src, 'a.txt', 'one', 'utf8')
  await pda.writeFile(src, 'a.txt', 'two', 'utf8')
  await pda.writeFile(src, 'b.txt', 'two', 'utf8')
  await pda.writeFile(src, 'c.txt', 'one', 'utf8')

  await pda.download(dst, 'a.txt')
  await pda.download(dst, 'c.txt')
  await pda.download(dst, 'b.txt')
})

test('createFileActivityStream remote non-sparse', async t => {
  var archive

  // no pattern
  // =

  const src = await tutil.createArchive()
  await new Promise(resolve => src.ready(resolve))
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: false})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  var stream = pda.createFileActivityStream(dst)

  // invalidation phase

  var whenDone = new Promise(resolve => {
    var invalidates = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
    var changes = ['/a.txt', '/b.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        changes.splice(changes.indexOf(args.path), 1)
      }
      if (invalidates.length === 0 && changes.length === 0) {
        resolve()
      }
    })
  })

  await pda.writeFile(src, 'a.txt', 'one', 'utf8')
  await pda.writeFile(src, 'b.txt', 'one', 'utf8')
  await pda.writeFile(src, 'a.txt', 'one', 'utf8')
  await pda.writeFile(src, 'a.txt', 'two', 'utf8')
  await pda.writeFile(src, 'b.txt', 'two', 'utf8')
  await pda.writeFile(src, 'c.txt', 'one', 'utf8')
  await whenDone
})

// TODO
/*
test('createNetworkActivityStream', async t => {
  const src = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'bar.txt'
  ])

  const drive2 = hyperdrive(memdb())
  const dst = drive2.createArchive(src.key, {
    live: true,
    sparse: false
  })

  var whenDone = new Promise(resolve => {
    var stream = pda.createNetworkActivityStream(dst)
    var gotPeer = false
    var stats = {
      metadata: {
        down: 0,
        all: false
      },
      content: {
        down: 0,
        all: false
      }
    }
    stream.on('data', ([event, args]) => {
      if (event === 'network-changed') {
        gotPeer = true
      } else if (event === 'download') {
        stats[args.feed].down++
      } else if (event === 'download-finished') {
        stats[args.feed].all = true
      }
      if (gotPeer && 
        stats.metadata.down === 4 && stats.metadata.all &&
        stats.content.down === 3 && stats.content.all) {
        resolve()
      }
    })
  })

  const srcRS = src.replicate()
  const dstRS = dst.replicate()
  srcRS.pipe(dstRS).pipe(srcRS)

  await whenDone
})*/
