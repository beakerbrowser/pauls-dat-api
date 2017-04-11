const test = require('ava')
const fs = require('fs')
const path = require('path')
const hyperdrive = require('hyperdrive')
const tutil = require('./util')
const pda = require('../index')

function isDownloaded (st) {
  return st.blocks === st.downloaded
}

async function contentEvent (archive) {
  return new Promise(resolve => {
    archive.on('content', resolve)
  })
}

test('download individual files', async t => {
  const src = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/',
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) },
  ])
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: true})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  await pda.download(dst, '/foo.txt')
  await pda.download(dst, 'bar.data')
  await pda.download(dst, '/subdir/foo.txt')
  await pda.download(dst, 'subdir/bar.data')
  t.deepEqual(isDownloaded(await pda.stat(dst, '/foo.txt')), true)
  t.deepEqual(isDownloaded(await pda.stat(dst, '/bar.data')), true)
  t.deepEqual(isDownloaded(await pda.stat(dst, '/subdir/foo.txt')), true)
  t.deepEqual(isDownloaded(await pda.stat(dst, '/subdir/bar.data')), true)
})

test('download a subdirectory', async t => {
  const src = await tutil.createArchive([
    { name: 'foo.txt', content: 'This is the first file' },
    { name: 'bar.data', content: 'How about another' },
    'subdir/',
    { name: 'subdir/foo.txt', content: 'Sub dir item here' },
    { name: 'subdir/bar.data', content: 'And the last one' },
  ])
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: true})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  await pda.download(dst, '/subdir')
  t.deepEqual(isDownloaded(await pda.stat(dst, '/foo.txt')), false)
  t.deepEqual(isDownloaded(await pda.stat(dst, '/bar.data')), false)
  t.deepEqual(isDownloaded(await pda.stat(dst, '/subdir/foo.txt')), true)
  t.deepEqual(isDownloaded(await pda.stat(dst, '/subdir/bar.data')), true)
})

test('download a full archive', async t => {
  const src = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/',
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) },
  ])
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: true})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  await pda.download(dst, '/')
  t.deepEqual(isDownloaded(await pda.stat(dst, '/foo.txt')), true)
  t.deepEqual(isDownloaded(await pda.stat(dst, '/bar.data')), true)
  t.deepEqual(isDownloaded(await pda.stat(dst, '/subdir/foo.txt')), true)
  t.deepEqual(isDownloaded(await pda.stat(dst, '/subdir/bar.data')), true)
})

// TODO restore timeouts
// test('timeout', async t => {
//   const src = await tutil.createArchive([
//     'foo.txt',
//     { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
//     'subdir/',
//     'subdir/foo.txt',
//     { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) },
//   ])
//   const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: true})
//   const srcRS = src.replicate()
//   const dstRS = dst.replicate()
//   srcRS.pipe(dstRS).pipe(srcRS)

//   // download metadata then end replication
//   await contentEvent(dst)
//   dstRS.end()

//   // try to fetch a file
//   await t.throws(pda.download(dst, '/foo.txt', { timeout: 100 }))
// })