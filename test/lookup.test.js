const test = require('ava')
const tutil = require('./util')
const pda = require('../index')

test('lookupEntry by name', async t => {
  var archive

  async function lookupTest (archive, given, expected) {
    var entry = await pda.lookupEntry(archive, given)
    if (expected) {
      t.truthy(entry)
      t.deepEqual(entry.name, expected)
    } else {
      t.falsy(entry)
    }
  }

  // without preceding slashes
  // =

  archive = await tutil.createArchive([
    'foo',
    'foo/bar',
    'baz'
  ])

  await lookupTest(archive, 'foo', 'foo')
  await lookupTest(archive, '/foo', 'foo')
  await lookupTest(archive, 'foo/bar', 'foo/bar')
  await lookupTest(archive, '/foo/bar', 'foo/bar')
  await lookupTest(archive, 'baz', 'baz')
  await lookupTest(archive, '/baz', 'baz')
  await lookupTest(archive, 'notfound', false)

  // with preceding slashes
  // =  

  archive = await tutil.createArchive([
    '/foo',
    '/foo/bar',
    '/baz'
  ])

  await lookupTest(archive, 'foo', '/foo')
  await lookupTest(archive, '/foo', '/foo')
  await lookupTest(archive, 'foo/bar', '/foo/bar')
  await lookupTest(archive, '/foo/bar', '/foo/bar')
  await lookupTest(archive, 'baz', '/baz')
  await lookupTest(archive, '/baz', '/baz')
  await lookupTest(archive, 'notfound', false)
})