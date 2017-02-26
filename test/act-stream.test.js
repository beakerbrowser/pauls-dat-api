const test = require('ava')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const tutil = require('./util')
const pda = require('../index')

test('createFileActivityStream local', async t => {
  var archive

  // no pattern
  // =

  archive = await tutil.createArchive()
  var stream = pda.createFileActivityStream(archive)

  var changes = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
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

  const drive2 = hyperdrive(memdb())
  const srcArchive = await tutil.createArchive()
  const dstArchive = drive2.createArchive(srcArchive.key, {
    live: true,
    sparse: true
  })
  dstArchive.metadata.prioritize({priority: 0, start: 0, end: Infinity})

  const srcRS = srcArchive.replicate()
  const dstRS = dstArchive.replicate()
  srcRS.pipe(dstRS).pipe(srcRS)

  var stream = pda.createFileActivityStream(dstArchive)

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

  await pda.writeFile(srcArchive, 'a.txt', 'one', 'utf8')
  await pda.writeFile(srcArchive, 'b.txt', 'one', 'utf8')
  await pda.writeFile(srcArchive, 'a.txt', 'one', 'utf8')
  await pda.writeFile(srcArchive, 'a.txt', 'two', 'utf8')
  await pda.writeFile(srcArchive, 'b.txt', 'two', 'utf8')
  await pda.writeFile(srcArchive, 'c.txt', 'one', 'utf8')

  await pda.download(dstArchive, 'a.txt')
  await pda.download(dstArchive, 'c.txt')
  await pda.download(dstArchive, 'b.txt')
})

test('createFileActivityStream remote non-sparse', async t => {
  var archive

  // no pattern
  // =

  const drive2 = hyperdrive(memdb())
  const srcArchive = await tutil.createArchive()
  const dstArchive = drive2.createArchive(srcArchive.key, {
    live: true,
    sparse: false
  })

  const srcRS = srcArchive.replicate()
  const dstRS = dstArchive.replicate()
  srcRS.pipe(dstRS).pipe(srcRS)

  var stream = pda.createFileActivityStream(dstArchive)

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

  await pda.writeFile(srcArchive, 'a.txt', 'one', 'utf8')
  await pda.writeFile(srcArchive, 'b.txt', 'one', 'utf8')
  await pda.writeFile(srcArchive, 'a.txt', 'one', 'utf8')
  await pda.writeFile(srcArchive, 'a.txt', 'two', 'utf8')
  await pda.writeFile(srcArchive, 'b.txt', 'two', 'utf8')
  await pda.writeFile(srcArchive, 'c.txt', 'one', 'utf8')
  await whenDone
})
