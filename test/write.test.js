const test = require('ava')
const tutil = require('./util')
const pda = require('../index')

test('writeFile', async t => {
  var archive

  async function testFile (path, expected) {
    var data = await pda.readFile(archive, path, Buffer.isBuffer(expected) ? 'binary' : 'utf8')
    t.deepEqual(data, expected)
  }

  archive = await tutil.createArchive([
    'foo'
  ])

  await testFile('foo', 'content')
  await pda.writeFile(archive, '/foo', 'new content')
  await testFile('foo', 'new content')
  await pda.writeFile(archive, 'foo', Buffer.from([0x01]))
  await testFile('foo', Buffer.from([0x01]))
  await pda.writeFile(archive, 'foo', '02', 'hex')
  await testFile('foo', Buffer.from([0x02]))
  await pda.writeFile(archive, 'foo', 'Aw==', { encoding: 'base64' })
  await testFile('foo', Buffer.from([0x03]))
})

test('createDirectory', async t => {
  var archive

  archive = await tutil.createArchive([
    'foo'
  ])

  await pda.createDirectory(archive, '/bar')
  t.deepEqual(Object.keys(await pda.listFiles(archive, '/')), ['foo', 'bar'])
  t.deepEqual((await pda.lookupEntry(archive, '/bar')).type, 'directory')
})