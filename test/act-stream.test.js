const test = require('ava')
const hyperdrive = require('hyperdrive')
const hyperstaging = require('hyperdrive-staging-area')
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
  var stream
  var done

  // no pattern
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.createFileActivityStream(archive)

  done = new Promise(resolve => {
    changes = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      t.deepEqual(event, 'changed')
      t.deepEqual(args.path, changes.shift())
      if (changes.length === 0) resolve()
    })
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')
  await done

  // simple pattern
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.createFileActivityStream(archive, '/a.txt')

  done = new Promise(resolve => {
    changes = ['/a.txt', '/a.txt', '/a.txt']
    stream.on('data', ([event, args]) => {
      t.deepEqual(event, 'changed')
      t.deepEqual(args.path, changes.shift())
      if (changes.length === 0) resolve()
    })
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')
  await done

  // complex pattern
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.createFileActivityStream(archive, ['/a.txt', '/c.txt'])

  done = new Promise(resolve => {
    changes = ['/a.txt', '/a.txt', '/a.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      t.deepEqual(event, 'changed')
      t.deepEqual(args.path, changes.shift())
      if (changes.length === 0) resolve()
    })
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')
  await done

  // glob
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.createFileActivityStream(archive, '/*.txt')

  done = new Promise(resolve => {
    changes = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      t.deepEqual(event, 'changed')
      t.deepEqual(args.path, changes.shift())
      if (changes.length === 0) resolve()
    })
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')
  await done
})

test('createFileActivityStream local w/staging', async t => {
  var archive
  var changes
  var stream
  var done

  // no pattern
  // =

  archive = await tutil.createArchive([], {staging: true})
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.createFileActivityStream(archive, archive.staging)

  done = new Promise(resolve => {
    var nChanges = 3
    changes = ['/a.txt', '/b.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      t.deepEqual(event, 'changed')
      t.deepEqual(changes.indexOf(args.path) !== -1, true)
      if (--nChanges === 0) resolve()
    })
  })

  await pda.writeFile(archive.staging, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive.staging, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive.staging, '/c.txt', 'one', 'utf8')
  await done

  // simple pattern
  // =

  archive = await tutil.createArchive([], {staging: true})
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.createFileActivityStream(archive, archive.staging, '/a.txt')

  done = new Promise(resolve => {
    var nChanges = 1
    changes = ['/a.txt']
    stream.on('data', ([event, args]) => {
      t.deepEqual(event, 'changed')
      t.deepEqual(changes.indexOf(args.path) !== -1, true)
      if (--nChanges === 0) resolve()
    })
  })

  await pda.writeFile(archive.staging, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive.staging, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive.staging, '/c.txt', 'one', 'utf8')
  await done

  // complex pattern
  // =

  archive = await tutil.createArchive([], {staging: true})
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.createFileActivityStream(archive, archive.staging, ['/a.txt', '/c.txt'])

  done = new Promise(resolve => {
    var nChanges = 2
    changes = ['/a.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      t.deepEqual(event, 'changed')
      t.deepEqual(changes.indexOf(args.path) !== -1, true)
      if (--nChanges === 0) resolve()
    })
  })

  await pda.writeFile(archive.staging, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive.staging, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive.staging, '/c.txt', 'one', 'utf8')
  await done

  // glob
  // =

  archive = await tutil.createArchive([], {staging: true})
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.createFileActivityStream(archive, archive.staging, '/*.txt')

  done = new Promise(resolve => {
    var nChanges = 3
    changes = ['/a.txt', '/b.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      t.deepEqual(event, 'changed')
      t.deepEqual(changes.indexOf(args.path) !== -1, true)
      if (--nChanges === 0) resolve()
    })
  })

  await pda.writeFile(archive.staging, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive.staging, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive.staging, '/c.txt', 'one', 'utf8')
  await done
})

test('createFileActivityStream remote sparse', async t => {
  // no pattern
  // =

  var done
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
  done = new Promise(resolve => {
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        t.deepEqual(args.path, changes.shift())
      }
      if (changes.length === 0 && invalidates.length === 0) resolve()
    })
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

  await done
})

test('createFileActivityStream remote sparse w/staging', async t => {
  // no pattern
  // =

  var done
  const src = await tutil.createArchive()
  await new Promise(resolve => src.ready(resolve))
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: true})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  dst.staging = hyperstaging(dst, tutil.tmpdir())
  dst.staging.startAutoSync()

  var stream = pda.createFileActivityStream(dst, dst.staging)
  
  done = new Promise(resolve => {
    var invalidates = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
    var changes = ['/a.txt', '/b.txt', '/c.txt']
    var nChanges = 3
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        t.deepEqual(changes.indexOf(args.path) !== -1, true)
        nChanges--
      }
      if (nChanges <= 0 && invalidates.length === 0) resolve()
    })
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

  await done
})

test('createFileActivityStream remote non-sparse', async t => {
  // no pattern
  // =

  var done
  const src = await tutil.createArchive()
  await new Promise(resolve => src.ready(resolve))
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: false})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  var stream = pda.createFileActivityStream(dst)

  // invalidation phase

  var done = new Promise(resolve => {
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
  await done
})

test('createFileActivityStream remote non-sparse w/staging', async t => {
  // no pattern
  // =

  var done
  const src = await tutil.createArchive()
  await new Promise(resolve => src.ready(resolve))
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: false})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  dst.staging = hyperstaging(dst, tutil.tmpdir())
  dst.staging.startAutoSync()

  var stream = pda.createFileActivityStream(dst, dst.staging)

  done = new Promise(resolve => {
    var invalidates = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
    var changes = ['/a.txt', '/b.txt', '/c.txt']
    var nChanges = 3
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        t.deepEqual(changes.indexOf(args.path) !== -1, true)
        nChanges--
      }
      if (nChanges <= 0 && invalidates.length === 0) resolve()
    })
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

  await done
})

test('createNetworkActivityStream', async t => {
  const src = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'bar.txt'
  ])
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: false})

  var done = new Promise(resolve => {
    var stream = pda.createNetworkActivityStream(dst)
    var gotPeer = false
    var stats = {
      metadata: {
        down: 0,
        synced: false
      },
      content: {
        down: 0,
        synced: false
      }
    }
    stream.on('data', ([event, args]) => {
      if (event === 'network-changed') {
        gotPeer = true
      } else if (event === 'download') {
        stats[args.feed].down++
      } else if (event === 'sync') {
        stats[args.feed].synced = true
      }
      if (gotPeer &&
        stats.metadata.down === 4 && stats.metadata.synced &&
        stats.content.down === 3 && stats.content.synced) {
        resolve()
      }
    })
  })

  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)

  await done
})
