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
  t.deepEqual(await pda.readFile(archive, 'foo', 'buffer'), Buffer.from([0x01]))
  await pda.writeFile(archive, 'foo', '02', 'hex')
  t.deepEqual(await pda.readFile(archive, 'foo', 'buffer'), Buffer.from([0x02]))
  await pda.writeFile(archive, 'foo', 'Aw==', { encoding: 'base64' })
  t.deepEqual(await pda.readFile(archive, 'foo', 'buffer'), Buffer.from([0x03]))
})

test('writeFile w/fs', async t => {
  var fs = await tutil.createFs([
    'foo'
  ])

  t.deepEqual(await pda.readFile(fs, 'foo'), 'content')
  await pda.writeFile(fs, '/foo', 'new content')
  t.deepEqual(await pda.readFile(fs, 'foo'), 'new content')
  await pda.writeFile(fs, 'foo', Buffer.from([0x01]))
  t.deepEqual(await pda.readFile(fs, 'foo', 'buffer'), Buffer.from([0x01]))
  await pda.writeFile(fs, 'foo', '02', 'hex')
  t.deepEqual(await pda.readFile(fs, 'foo', 'buffer'), Buffer.from([0x02]))
  await pda.writeFile(fs, 'foo', 'Aw==', { encoding: 'base64' })
  t.deepEqual(await pda.readFile(fs, 'foo', 'buffer'), Buffer.from([0x03]))
})

test('mkdir', async t => {
  var archive = await tutil.createArchive([
    'foo'
  ])

  await pda.mkdir(archive, '/bar')
  t.deepEqual((await pda.readdir(archive, '/')).sort(), ['bar', 'foo'])
  t.deepEqual((await pda.stat(archive, '/bar')).isDirectory(), true)
})

test('mkdir w/fs', async t => {
  var fs = await tutil.createFs([
    'foo'
  ])

  await pda.mkdir(fs, '/bar')
  t.deepEqual((await pda.readdir(fs, '/')).sort(), ['bar', 'foo'])
  t.deepEqual((await pda.stat(fs, '/bar')).isDirectory(), true)
})

test('copy', async t => {
  var archive = await tutil.createArchive([
    {name: 'a', content: 'thecopy'},
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/b/c',
    'b/c',
    'c/'
  ])

  await pda.copy(archive, '/a', '/a-copy')
  t.deepEqual(await pda.readFile(archive, '/a-copy'), 'thecopy')
  t.deepEqual((await pda.stat(archive, '/a-copy')).isFile(), true)

  await pda.copy(archive, '/b', '/b-copy')
  t.deepEqual((await pda.stat(archive, '/b-copy')).isDirectory(), true)
  t.deepEqual(await pda.readFile(archive, '/b-copy/a'), 'content')
  t.deepEqual((await pda.stat(archive, '/b-copy/b')).isDirectory(), true)
  t.deepEqual(await pda.readFile(archive, '/b-copy/b/a'), 'content')
  t.deepEqual(await pda.readFile(archive, '/b-copy/b/b'), 'content')
  t.deepEqual(await pda.readFile(archive, '/b-copy/b/c'), 'content')
  t.deepEqual(await pda.readFile(archive, '/b-copy/c'), 'content')

  await pda.copy(archive, '/b/b', '/c')
  t.deepEqual((await pda.stat(archive, '/c')).isDirectory(), true)
  t.deepEqual(await pda.readFile(archive, 'c/a'), 'content')
  t.deepEqual(await pda.readFile(archive, 'c/b'), 'content')
  t.deepEqual(await pda.readFile(archive, 'c/c'), 'content')

  const err1 = await t.throws(pda.copy(archive, '/b', '/b/sub'))
  t.truthy(err1.invalidPath)

  const err2 = await t.throws(pda.copy(archive, '/b', '/b'))
  t.truthy(err2.invalidPath)
})

test('copy w/fs', async t => {
  var fs = await tutil.createFs([
    {name: 'a', content: 'thecopy'},
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/b/c',
    'b/c',
    'c/'
  ])

  await pda.copy(fs, '/a', '/a-copy')
  t.deepEqual(await pda.readFile(fs, '/a-copy'), 'thecopy')
  t.deepEqual((await pda.stat(fs, '/a-copy')).isFile(), true)

  await pda.copy(fs, '/b', '/b-copy')
  t.deepEqual((await pda.stat(fs, '/b-copy')).isDirectory(), true)
  t.deepEqual(await pda.readFile(fs, '/b-copy/a'), 'content')
  t.deepEqual((await pda.stat(fs, '/b-copy/b')).isDirectory(), true)
  t.deepEqual(await pda.readFile(fs, '/b-copy/b/a'), 'content')
  t.deepEqual(await pda.readFile(fs, '/b-copy/b/b'), 'content')
  t.deepEqual(await pda.readFile(fs, '/b-copy/b/c'), 'content')
  t.deepEqual(await pda.readFile(fs, '/b-copy/c'), 'content')

  await pda.copy(fs, '/b/b', '/c')
  t.deepEqual((await pda.stat(fs, '/c')).isDirectory(), true)
  t.deepEqual(await pda.readFile(fs, 'c/a'), 'content')
  t.deepEqual(await pda.readFile(fs, 'c/b'), 'content')
  t.deepEqual(await pda.readFile(fs, 'c/c'), 'content')

})

test('rename', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/b/c',
    'b/c',
    'c/'
  ])

  await pda.rename(archive, '/a', '/a-rename')
  t.deepEqual(await pda.readFile(archive, '/a-rename'), 'content')
  t.deepEqual((await pda.stat(archive, '/a-rename')).isFile(), true)

  await pda.rename(archive, '/b', '/b-rename')
  t.deepEqual((await pda.stat(archive, '/b-rename')).isDirectory(), true)
  t.deepEqual(await pda.readFile(archive, '/b-rename/a'), 'content')
  t.deepEqual((await pda.stat(archive, '/b-rename/b')).isDirectory(), true)
  t.deepEqual(await pda.readFile(archive, '/b-rename/b/a'), 'content')
  t.deepEqual(await pda.readFile(archive, '/b-rename/b/b'), 'content')
  t.deepEqual(await pda.readFile(archive, '/b-rename/b/c'), 'content')
  t.deepEqual(await pda.readFile(archive, '/b-rename/c'), 'content')

  await pda.rename(archive, '/b-rename/b', '/c/newb')
  t.deepEqual((await pda.stat(archive, '/c/newb')).isDirectory(), true)
  t.deepEqual(await pda.readFile(archive, 'c/newb/a'), 'content')
  t.deepEqual(await pda.readFile(archive, 'c/newb/b'), 'content')
  t.deepEqual(await pda.readFile(archive, 'c/newb/c'), 'content')

  const err1 = await t.throws(pda.rename(archive, '/b-rename', '/b-rename/sub'))
  t.truthy(err1.invalidPath)
})

test('rename w/fs', async t => {
  var fs = await tutil.createFs([
    'a',
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/b/c',
    'b/c',
    'c/'
  ])

  await pda.rename(fs, '/a', '/a-rename')
  t.deepEqual(await pda.readFile(fs, '/a-rename'), 'content')
  t.deepEqual((await pda.stat(fs, '/a-rename')).isFile(), true)

  await pda.rename(fs, '/b', '/b-rename')
  t.deepEqual((await pda.stat(fs, '/b-rename')).isDirectory(), true)
  t.deepEqual(await pda.readFile(fs, '/b-rename/a'), 'content')
  t.deepEqual((await pda.stat(fs, '/b-rename/b')).isDirectory(), true)
  t.deepEqual(await pda.readFile(fs, '/b-rename/b/a'), 'content')
  t.deepEqual(await pda.readFile(fs, '/b-rename/b/b'), 'content')
  t.deepEqual(await pda.readFile(fs, '/b-rename/b/c'), 'content')
  t.deepEqual(await pda.readFile(fs, '/b-rename/c'), 'content')

  await pda.rename(fs, '/b-rename/b', '/c/newb')
  t.deepEqual((await pda.stat(fs, '/c/newb')).isDirectory(), true)
  t.deepEqual(await pda.readFile(fs, 'c/newb/a'), 'content')
  t.deepEqual(await pda.readFile(fs, 'c/newb/b'), 'content')
  t.deepEqual(await pda.readFile(fs, 'c/newb/c'), 'content')
})

test('EntryAlreadyExistsError', async t => {
  var archive = await tutil.createArchive([])
  await new Promise(resolve => archive.ready(resolve))

  await pda.mkdir(archive, '/dir')
  const err1 = await t.throws(pda.writeFile(archive, '/dir', 'new content'))
  t.truthy(err1.entryAlreadyExists)

  await pda.writeFile(archive, '/file', 'new content')
  const err2 = await t.throws(pda.mkdir(archive, '/file'))
  t.truthy(err2.entryAlreadyExists)

  const err3 = await t.throws(pda.copy(archive, '/dir', '/file'))
  t.truthy(err3.entryAlreadyExists)

  const err4 = await t.throws(pda.copy(archive, '/file', '/dir'))
  t.truthy(err4.entryAlreadyExists)

  const err5 = await t.throws(pda.rename(archive, '/dir', '/file'))
  t.truthy(err5.entryAlreadyExists)

  const err6 = await t.throws(pda.rename(archive, '/file', '/dir'))
  t.truthy(err6.entryAlreadyExists)
})

test('EntryAlreadyExistsError w/fs', async t => {
  var fs = await tutil.createFs([])

  await pda.mkdir(fs, '/dir')
  const err1 = await t.throws(pda.writeFile(fs, '/dir', 'new content'))
  t.truthy(err1.entryAlreadyExists)

  await pda.writeFile(fs, '/file', 'new content')
  const err2 = await t.throws(pda.mkdir(fs, '/file'))
  t.truthy(err2.entryAlreadyExists)

  const err3 = await t.throws(pda.copy(fs, '/dir', '/file'))
  t.truthy(err3.entryAlreadyExists)

  const err4 = await t.throws(pda.copy(fs, '/file', '/dir'))
  t.truthy(err4.entryAlreadyExists)

  const err5 = await t.throws(pda.rename(fs, '/dir', '/file'))
  t.truthy(err5.entryAlreadyExists)

  const err6 = await t.throws(pda.rename(fs, '/file', '/dir'))
  t.truthy(err6.entryAlreadyExists)
})

test('ArchiveNotWritableError', async t => {
  const archive = hyperdrive(tutil.tmpdir(), tutil.FAKE_DAT_KEY, {createIfMissing: false})
  await new Promise(resolve => archive.ready(resolve))

  const err1 = await t.throws(pda.mkdir(archive, '/bar'))
  t.truthy(err1.archiveNotWritable)

  const err2 = await t.throws(pda.writeFile(archive, '/bar', 'foo'))
  t.truthy(err2.archiveNotWritable)

  const err3 = await t.throws(pda.copy(archive, '/foo', '/bar'))
  t.truthy(err3.archiveNotWritable)

  const err4 = await t.throws(pda.rename(archive, '/foo', '/bar'))
  t.truthy(err4.archiveNotWritable)
})

test('InvalidPathError', async t => {
  var archive = await tutil.createArchive([])
  await new Promise(resolve => archive.ready(resolve))

  const err1 = await t.throws(pda.writeFile(archive, '/foo%20bar', 'new content'))
  t.truthy(err1.invalidPath)

  const err2 = await t.throws(pda.mkdir(archive, '/foo%20bar'))
  t.truthy(err2.invalidPath)

  const err3 = await t.throws(pda.copy(archive, '/foo', '/foo%20bar'))
  t.truthy(err3.invalidPath)

  const err4 = await t.throws(pda.rename(archive, '/foo', '/foo%20bar'))
  t.truthy(err4.invalidPath)

  const noerr = await pda.mkdir(archive, '/foo bar')
  t.truthy(typeof noerr === 'undefined')
})

test('InvalidPathError w/fs', async t => {
  var fs = await tutil.createFs([])

  const err1 = await t.throws(pda.writeFile(fs, '/foo%20bar', 'new content'))
  t.truthy(err1.invalidPath)

  const err2 = await t.throws(pda.mkdir(fs, '/foo%20bar'))
  t.truthy(err2.invalidPath)

  const err3 = await t.throws(pda.copy(fs, '/foo', '/foo%20bar'))
  t.truthy(err3.invalidPath)

  const err4 = await t.throws(pda.rename(fs, '/foo', '/foo%20bar'))
  t.truthy(err4.invalidPath)

  const noerr = await pda.mkdir(fs, '/foo bar')
  t.truthy(typeof noerr === 'undefined')
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

  const err5 = await t.throws(pda.copy(archive, '/foo', '/bar/foo'))
  t.truthy(err5.parentFolderDoesntExist)

  const err6 = await t.throws(pda.rename(archive, '/foo', '/bar/foo'))
  t.truthy(err6.parentFolderDoesntExist)
})

test('ParentFolderDoesntExistError w/fs', async t => {
  var fs = await tutil.createFs([
    'foo'
  ])

  const err1 = await t.throws(pda.writeFile(fs, '/bar/foo', 'new content'))
  t.truthy(err1.parentFolderDoesntExist)

  const err2 = await t.throws(pda.writeFile(fs, '/foo/bar', 'new content'))
  t.truthy(err2.parentFolderDoesntExist)

  const err3 = await t.throws(pda.mkdir(fs, '/bar/foo'))
  t.truthy(err3.parentFolderDoesntExist)

  const err4 = await t.throws(pda.mkdir(fs, '/foo/bar'))
  t.truthy(err4.parentFolderDoesntExist)

  const err5 = await t.throws(pda.copy(fs, '/foo', '/bar/foo'))
  t.truthy(err5.parentFolderDoesntExist)

  const err6 = await t.throws(pda.rename(fs, '/foo', '/bar/foo'))
  t.truthy(err6.parentFolderDoesntExist)
})
