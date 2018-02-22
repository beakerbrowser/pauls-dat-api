const test = require('ava')
const {NotFoundError, NotAFileError} = require('beaker-error-constants')
const tutil = require('./util')
const pda = require('../index')

var target
async function readTest (t, path, expected, errorTests) {
  try {
    var data = await pda.readFile(target, path, Buffer.isBuffer(expected) ? 'binary' : 'utf8')
    t.deepEqual(data, expected)
  } catch (e) {
    if (errorTests) errorTests(t, e)
    else throw e
  }
}

readTest.title = (_, path) => `readFile(${path}) test`
test('create archive', async t => {
  target = await tutil.createArchive([
    'foo',
    'foo2/',
    'foo2/bar',
    { name: 'baz', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) },
    'dir/'
  ])
})

test(readTest, 'foo', 'content')
test(readTest, '/foo', 'content')
test(readTest, 'foo2/bar', 'content')
test(readTest, '/foo2/bar', 'content')
test(readTest, 'baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
test(readTest, '/baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
test(readTest, 'doesnotexist', null, (t, err) => {
  t.truthy(err instanceof NotFoundError)
  t.truthy(err.notFound)
})
test(readTest, 'dir/', null, (t, err) => {
  t.truthy(err instanceof NotAFileError)
  t.truthy(err.notAFile)
})

readTest.title = (_, path) => `readFile(${path}) test (w/fs)`
test('create archive w/fs', async t => {
  target = await tutil.createFs([
    'foo',
    'foo2/',
    'foo2/bar',
    { name: 'baz', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) },
    'dir/'
  ])
})

test(readTest, 'foo', 'content')
test(readTest, '/foo', 'content')
test(readTest, 'foo2/bar', 'content')
test(readTest, '/foo2/bar', 'content')
test(readTest, 'baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
test(readTest, '/baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
test(readTest, 'doesnotexist', null, (t, err) => {
  t.truthy(err instanceof NotFoundError)
  t.truthy(err.notFound)
})
test(readTest, 'dir/', null, (t, err) => {
  t.truthy(err instanceof NotAFileError)
  t.truthy(err.notAFile)
})

test('readFile encodings', async t => {
  var archive = await tutil.createArchive([
    { name: 'buf', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) }
  ])

  await t.deepEqual(await pda.readFile(archive, 'buf', 'binary'), Buffer.from([0x00, 0x01, 0x02, 0x03]))
  await t.deepEqual(await pda.readFile(archive, 'buf', 'hex'), '00010203')
  await t.deepEqual(await pda.readFile(archive, 'buf', 'base64'), 'AAECAw==')
})

test('readFile encodings w/fs', async t => {
  var fs = await tutil.createFs([
    { name: 'buf', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) }
  ])

  await t.deepEqual(await pda.readFile(fs, 'buf', 'binary'), Buffer.from([0x00, 0x01, 0x02, 0x03]))
  await t.deepEqual(await pda.readFile(fs, 'buf', 'hex'), '00010203')
  await t.deepEqual(await pda.readFile(fs, 'buf', 'base64'), 'AAECAw==')
})

test('readdir', async t => {
  var archive = await tutil.createArchive([
    'foo/',
    'foo/bar',
    'baz'
  ])

  t.deepEqual(await pda.readdir(archive, ''), ['foo', 'baz'])
  t.deepEqual(await pda.readdir(archive, '/'), ['foo', 'baz'])
  t.deepEqual(await pda.readdir(archive, 'foo'), ['bar'])
  t.deepEqual(await pda.readdir(archive, '/foo'), ['bar'])
  t.deepEqual(await pda.readdir(archive, '/foo/'), ['bar'])
})

test('readdir w/fs', async t => {
  var fs = await tutil.createFs([
    'foo/',
    'foo/bar',
    'baz'
  ])

  t.deepEqual((await pda.readdir(fs, '')).sort(), ['baz', 'foo'])
  t.deepEqual((await pda.readdir(fs, '/')).sort(), ['baz', 'foo'])
  t.deepEqual(await pda.readdir(fs, 'foo'), ['bar'])
  t.deepEqual(await pda.readdir(fs, '/foo'), ['bar'])
  t.deepEqual(await pda.readdir(fs, '/foo/'), ['bar'])
})

test('readdir recursive', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/c/',
    'c/',
    'c/a',
    'c/b'
  ])

  t.deepEqual((await pda.readdir(archive, '/', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b',
    'b/a',
    'b/b',
    'b/b/a',
    'b/b/b',
    'b/c',
    'c',
    'c/a',
    'c/b'
  ])

  t.deepEqual((await pda.readdir(archive, '/b', {recursive: true})).map(tutil.tonix).map(stripPrecedingSlash).sort(), [
    'a',
    'b',
    'b/a',
    'b/b',
    'c'
  ])

  t.deepEqual((await pda.readdir(archive, '/b/b', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b'
  ])

  t.deepEqual((await pda.readdir(archive, '/c', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b'
  ])
})

test('readdir recursive w/fs', async t => {
  var fs = await tutil.createFs([
    'a',
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/c/',
    'c/',
    'c/a',
    'c/b'
  ])

  t.deepEqual((await pda.readdir(fs, '/', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b',
    'b/a',
    'b/b',
    'b/b/a',
    'b/b/b',
    'b/c',
    'c',
    'c/a',
    'c/b'
  ])

  t.deepEqual((await pda.readdir(fs, '/b', {recursive: true})).map(tutil.tonix).map(stripPrecedingSlash).sort(), [
    'a',
    'b',
    'b/a',
    'b/b',
    'c'
  ])

  t.deepEqual((await pda.readdir(fs, '/b/b', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b'
  ])

  t.deepEqual((await pda.readdir(fs, '/c', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b'
  ])
})

test('readSize', async t => {
  var archive1 = await tutil.createArchive([
    'a'
  ])
  var archive2 = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/c/',
    'c/',
    'c/a',
    'c/b'
  ])

  var size1 = await pda.readSize(archive1, '/')
  var size2 = await pda.readSize(archive2, '/')

  t.truthy(size1 > 0)
  t.truthy(size2 > 0)
  t.truthy(size2 > size1)

  var size3 = await pda.readSize(archive2, '/b')

  t.truthy(size3 > 0)
})

test('readSize w/fs', async t => {
  var fs1 = await tutil.createArchive([
    'a'
  ])
  var fs2 = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/c/',
    'c/',
    'c/a',
    'c/b'
  ])

  var size1 = await pda.readSize(fs1, '/')
  var size2 = await pda.readSize(fs2, '/')

  t.truthy(size1 > 0)
  t.truthy(size2 > 0)
  t.truthy(size2 > size1)

  var size3 = await pda.readSize(fs2, '/b')

  t.truthy(size3 > 0)
})


function stripPrecedingSlash (str) {
  if (str.charAt(0) == '/') return str.slice(1)
  return str
}