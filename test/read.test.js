const test = require('ava')
const tutil = require('./util')
const pda = require('../index')

test('readFile', async t => {
  var archive

  async function testFile (path, expected) {
    var data = await pda.readFile(archive, path, Buffer.isBuffer(expected) ? 'binary' : 'utf8')
    t.deepEqual(data, expected)
  }

  archive = await tutil.createArchive([
    'foo',
    'foo/bar',
    { name: 'baz', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) }
  ])

  await testFile('foo', 'content')
  await testFile('/foo', 'content')
  await testFile('foo/bar', 'content')
  await testFile('/foo/bar', 'content')
  await testFile('baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
  await testFile('/baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
  t.throws(testFile('doesnotexist'))
})

test('readFile encodings', async t => {
  var archive = await tutil.createArchive([
    { name: 'buf', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) }
  ])

  await t.deepEqual(await pda.readFile(archive, 'buf', 'binary'), Buffer.from([0x00, 0x01, 0x02, 0x03]))
  await t.deepEqual(await pda.readFile(archive, 'buf', 'hex'), '00010203')
  await t.deepEqual(await pda.readFile(archive, 'buf', 'base64'), 'AAECAw==')
})

test('listFiles', async t => {
  var archive = await tutil.createArchive([
    'foo',
    'foo/bar',
    'baz'
  ])

  t.deepEqual(Object.keys(await pda.listFiles(archive, '')), ['foo', 'baz'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/')), ['foo', 'baz'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, 'foo')), ['bar'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/foo')), ['bar'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/foo/')), ['bar'])
})