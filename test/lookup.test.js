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

test('lookupEntry timeout', async t => {
  var archive = tutil.drive.createArchive(tutil.FAKE_DAT_KEY, { live: true })

  // archive is now an empty, non-owned archive that hyperdrive needs data for
  // hyperdrive will defer read calls based on the expectation that data will arrive soon
  // since the data will never come, this is a good opportunity for us to test the lookupEntry timeout

  var startTime = Date.now()
  try {
    await pda.lookupEntry(archive, '/foo', {timeout: 500})
    t.fail('Should have thrown')
  } catch (e) {
    t.deepEqual(e.name, 'TimeoutError')
    t.truthy(e.timedOut)
    t.truthy((Date.now() - startTime) < 1e3)
  }
})