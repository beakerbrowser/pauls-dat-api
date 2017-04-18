const test = require('ava')
const hyperdrive = require('hyperdrive')
const {NotFoundError, NotAFileError} = require('beaker-error-constants')
const tutil = require('./util')
const pda = require('../index')

var archive
async function readTest (t, path, expected, errorTests) {
  try {
    var data = await pda.readFile(archive, path, Buffer.isBuffer(expected) ? 'binary' : 'utf8')
    t.deepEqual(data, expected)
  } catch (e) {
    if (errorTests) errorTests(t, e)
    else throw e
  }
}
readTest.title = (_, path) => `readFile(${path}) test`

test('create archive', async t => {
  archive = await tutil.createArchive([
    'foo',
    'foo/bar',
    { name: 'baz', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) },
    'dir/'
  ])
})

test(readTest, 'foo', 'content')
test(readTest, '/foo', 'content')
test(readTest, 'foo/bar', 'content')
test(readTest, '/foo/bar', 'content')
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

test('readdir', async t => {
  var archive = await tutil.createArchive([
    'foo',
    'foo/bar',
    'baz'
  ])

  t.deepEqual(await pda.readdir(archive, ''), ['foo', 'baz'])
  t.deepEqual(await pda.readdir(archive, '/'), ['foo', 'baz'])
  t.deepEqual(await pda.readdir(archive, 'foo'), ['bar'])
  t.deepEqual(await pda.readdir(archive, '/foo'), ['bar'])
  t.deepEqual(await pda.readdir(archive, '/foo/'), ['bar'])
})

test('readdir recursive', async t => {
  var res
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

  t.deepEqual((await pda.readdir(archive, '/', {recursive: true})).sort(), [
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

  t.deepEqual((await pda.readdir(archive, '/b', {recursive: true})).sort(), [
    'a',
    'b',
    'b/a',
    'b/b',
    'c'
  ])

  t.deepEqual((await pda.readdir(archive, '/b/b', {recursive: true})).sort(), [
    'a',
    'b'
  ])

  t.deepEqual((await pda.readdir(archive, '/c', {recursive: true})).sort(), [
    'a',
    'b'
  ])
})