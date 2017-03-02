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

test('readFile timeout', async t => {
  var archive = tutil.drive.createArchive(tutil.FAKE_DAT_KEY, { live: true })

  // archive is now an empty, non-owned archive that hyperdrive needs data for
  // hyperdrive will defer read calls based on the expectation that data will arrive soon
  // since the data will never come, this is a good opportunity for us to test the readFile timeout

  var startTime = Date.now()
  try {
    await pda.readFile(archive, '/foo', {timeout: 500})
    t.fail('Should have thrown')
  } catch (e) {
    t.truthy(e.timedOut)
    t.truthy((Date.now() - startTime) < 1e3)
  }
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

test('listFiles depth=n', async t => {
  var archive = await tutil.createArchive([
    'foo',
    'foo/bar',
    'foo/bar/baz',
    'baz',
    'one/two/three/four'
  ])

  t.deepEqual(Object.keys(await pda.listFiles(archive, '', {depth: 2})), ['foo', 'foo/bar', 'baz', 'one', 'one/two'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/', {depth: 2})), ['foo', 'foo/bar', 'baz', 'one', 'one/two'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, 'foo', {depth: 2})), ['bar', 'bar/baz'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/foo', {depth: 2})), ['bar', 'bar/baz'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/foo/', {depth: 2})), ['bar', 'bar/baz'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/', {depth: 3})), ['foo', 'foo/bar', 'foo/bar/baz', 'baz', 'one', 'one/two', 'one/two/three'])
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/', {depth: false})), ['foo', 'foo/bar', 'foo/bar/baz', 'baz', 'one', 'one/two', 'one/two/three', 'one/two/three/four'])
})