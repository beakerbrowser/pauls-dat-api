const test = require('ava')
const hyperdrive = require('hyperdrive')
const tutil = require('./util')
const pda = require('../index')

test('writeFile', async t => {
  var archive = await tutil.createArchive([
    'foo'
  ])

  t.deepEqual(await pda.readFile(archive, 'foo'), 'content')
  await pda.writeFile(archive, '/foo', 'new content')
  t.deepEqual(await pda.readFile(archive, 'foo'), 'new content')
  await pda.writeFile(archive, 'foo', Buffer.from([0x01]))
  t.deepEqual(await pda.readFile(archive, 'foo', 'binary'), Buffer.from([0x01]))
  await pda.writeFile(archive, 'foo', '02', 'hex')
  t.deepEqual(await pda.readFile(archive, 'foo', 'binary'), Buffer.from([0x02]))
  await pda.writeFile(archive, 'foo', 'Aw==', { encoding: 'base64' })
  t.deepEqual(await pda.readFile(archive, 'foo', 'binary'), Buffer.from([0x03]))
})

test('writeFile EntryAlreadyExistsError', async t => {
  var archive = await tutil.createArchive([])
  await new Promise(resolve => archive.ready(resolve))

  await pda.mkdir(archive, '/dir')

  const err1 = await t.throws(pda.writeFile(archive, '/dir', 'new content'))
  t.truthy(err1.entryAlreadyExists)
})

test('mkdir', async t => {
  var archive = await tutil.createArchive([
    'foo'
  ])

  await pda.mkdir(archive, '/bar')
  t.deepEqual(await pda.readdir(archive, '/'), ['foo', 'bar'])
  t.deepEqual((await pda.stat(archive, '/bar')).isDirectory(), true)
})

test('mkdir EntryAlreadyExistsError', async t => {
  var archive = await tutil.createArchive([])
  await new Promise(resolve => archive.ready(resolve))

  await pda.writeFile(archive, '/file', 'new content')

  const err1 = await t.throws(pda.mkdir(archive, '/file'))
  t.truthy(err1.entryAlreadyExists)
})

test('ArchiveNotWritableError', async t => {
  const archive = hyperdrive(tutil.tmpdir(), tutil.FAKE_DAT_KEY, {createIfMissing: false})
  await new Promise(resolve => archive.ready(resolve))

  const err1 = await t.throws(pda.mkdir(archive, '/bar'))
  t.truthy(err1.archiveNotWritable)
  const err2 = await t.throws(pda.writeFile(archive, '/bar', 'foo'))
  t.truthy(err1.archiveNotWritable)
})

test('InvalidPathError', async t => {
  var archive = await tutil.createArchive([])
  await new Promise(resolve => archive.ready(resolve))

  const err2 = await t.throws(pda.writeFile(archive, '/foo%20bar', 'new content'))
  t.truthy(err2.invalidPath)

  const err3 = await t.throws(pda.mkdir(archive, '/foo%20bar'))
  t.truthy(err3.invalidPath)
})

test('ParentFolderDoesntExistError', async t => {
  var archive = await tutil.createArchive([
    'foo'
  ])

  const err1 = await t.throws(pda.writeFile(archive, '/bar/foo', 'new content'))
  t.truthy(err1.parentFolderDoesntExist)

  const err2 = await t.throws(pda.writeFile(archive, '/foo/bar', 'new content'))
  t.truthy(err2.parentFolderDoesntExist)

  const err3 = await t.throws(pda.mkdir(archive, '/bar/foo'))
  t.truthy(err3.parentFolderDoesntExist)

  const err4 = await t.throws(pda.mkdir(archive, '/foo/bar'))
  t.truthy(err4.parentFolderDoesntExist)
})