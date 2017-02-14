const test = require('ava')
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

  await pda.createDirectory(archive, '/dir')

  const err1 = await t.throws(pda.writeFile(archive, '/dir', 'new content'))
  t.truthy(err1.entryAlreadyExists)
})

test('createDirectory', async t => {
  var archive = await tutil.createArchive([
    'foo'
  ])

  await pda.createDirectory(archive, '/bar')
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/')), ['foo', 'bar'])
  t.deepEqual((await pda.lookupEntry(archive, '/bar')).type, 'directory')
})

test('createDirectory EntryAlreadyExistsError', async t => {
  var archive = await tutil.createArchive([])

  await pda.writeFile(archive, '/file', 'new content')

  const err1 = await t.throws(pda.createDirectory(archive, '/file'))
  t.truthy(err1.entryAlreadyExists)
})

test('ArchiveNotWritableError', async t => {
  const archive = tutil.drive.createArchive(tutil.FAKE_DAT_KEY, { live: true })

  const err1 = await t.throws(pda.createDirectory(archive, '/bar'))
  t.truthy(err1.archiveNotWritable)
  const err2 = await t.throws(pda.writeFile(archive, '/bar', 'foo'))
  t.truthy(err1.archiveNotWritable)
})

test('InvalidPathError', async t => {
  var archive = await tutil.createArchive([])

  const err2 = await t.throws(pda.writeFile(archive, '/foo%20bar', 'new content'))
  t.truthy(err2.invalidPath)

  const err3 = await t.throws(pda.createDirectory(archive, '/foo%20bar'))
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

  const err3 = await t.throws(pda.createDirectory(archive, '/bar/foo'))
  t.truthy(err3.parentFolderDoesntExist)

  const err4 = await t.throws(pda.createDirectory(archive, '/foo/bar'))
  t.truthy(err4.parentFolderDoesntExist)
})