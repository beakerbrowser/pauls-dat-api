const test = require('ava')
const fs = require('fs')
const path = require('path')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const tutil = require('./util')
const pda = require('../index')

test('download individual files', async t => {
  const srcArchive = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/',
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) },
  ])

  const drive2 = hyperdrive(memdb())

  const dstArchive = drive2.createArchive(srcArchive.key, {
    live: true,
    sparse: true
  })

  const srcRS = srcArchive.replicate()
  const dstRS = dstArchive.replicate()
  srcRS.pipe(dstRS).pipe(srcRS)

  await pda.download(dstArchive, '/foo.txt')
  await pda.download(dstArchive, 'bar.data')
  await pda.download(dstArchive, '/subdir/foo.txt')
  await pda.download(dstArchive, 'subdir/bar.data')
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/foo.txt')), true)
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/bar.data')), true)
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/subdir/foo.txt')), true)
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/subdir/bar.data')), true)
})

test('download a subdirectory', async t => {
  const srcArchive = await tutil.createArchive([
    { name: 'foo.txt', content: 'This is the first file' },
    { name: 'bar.data', content: 'How about another' },
    'subdir/',
    { name: 'subdir/foo.txt', content: 'Sub dir item here' },
    { name: 'subdir/bar.data', content: 'And the last one' },
  ])

  const drive2 = hyperdrive(memdb())

  const dstArchive = drive2.createArchive(srcArchive.key, {
    live: true,
    sparse: true
  })

  const srcRS = srcArchive.replicate()
  const dstRS = dstArchive.replicate()
  srcRS.pipe(dstRS).pipe(srcRS)

  await pda.download(dstArchive, '/subdir')
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/foo.txt')), false)
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/bar.data')), false)
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/subdir/foo.txt')), true)
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/subdir/bar.data')), true)
})

test('download a full archive', async t => {
  const srcArchive = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/',
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) },
  ])

  const drive2 = hyperdrive(memdb())

  const dstArchive = drive2.createArchive(srcArchive.key, {
    live: true,
    sparse: true
  })

  const srcRS = srcArchive.replicate()
  const dstRS = dstArchive.replicate()
  srcRS.pipe(dstRS).pipe(srcRS)

  await pda.download(dstArchive, '/')
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/foo.txt')), true)
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/bar.data')), true)
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/subdir/foo.txt')), true)
  t.deepEqual(dstArchive.isEntryDownloaded(await pda.lookupEntry(dstArchive, '/subdir/bar.data')), true)
})

test('timeout', async t => {
  const srcArchive = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/',
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) },
  ])

  const drive2 = hyperdrive(memdb())

  const dstArchive = drive2.createArchive(srcArchive.key, {
    live: true,
    sparse: true
  })

  const srcRS = srcArchive.replicate()
  const dstRS = dstArchive.replicate()
  srcRS.pipe(dstRS).pipe(srcRS)

  // download the metadata feed
  dstArchive.metadata.prioritize({priority: 0, start: 0, end: Infinity})
  await new Promise(resolve => dstArchive.metadata.on('download-finished', resolve))

  // end the replication
  dstRS.end()

  // try to fetch a file
  await t.throws(pda.download(dstArchive, '/foo.txt', { timeout: 100 }))
})