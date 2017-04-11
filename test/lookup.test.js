const hyperdrive = require('hyperdrive')
const test = require('ava')
const tutil = require('./util')
const pda = require('../index')

var archive
async function stat (t, given, expected) {
  // run test
  try {
    var entry = await pda.stat(archive, given)
  } catch (e) {}
  if (expected) {
    t.truthy(entry)
  } else {
    t.falsy(entry)
  }
}
stat.title = (_, given, expected) => `stat(${given}) is ${expected ? 'found' : 'not found'}`

// without preceding slashes
// =

test('create archive', async t => {
  archive = await tutil.createArchive([
    'foo',
    'foo/bar',
    'baz'
  ])
})

test(stat, 'foo', true)
test(stat, '/foo', true)
test(stat, 'foo/bar', true)
test(stat, '/foo/bar', true)
test(stat, 'baz', true)
test(stat, '/baz', true)
test(stat, 'notfound', false)

// with preceding slashes
// =  

test('create archive', async t => {
  archive = await tutil.createArchive([
    '/foo',
    '/foo/bar',
    '/baz'
  ])
})

test(stat, 'foo', true)
test(stat, '/foo', true)
test(stat, 'foo/bar', true)
test(stat, '/foo/bar', true)
test(stat, 'baz', true)
test(stat, '/baz', true)
test(stat, 'notfound', false)

// TODO restore timeouts
// test('stat timeout', async t => {
//   var archive = hyperdrive(tutil.tmpdir(), tutil.FAKE_DAT_KEY, {createIfMissing: false})

//   // archive is now an empty, non-owned archive that hyperdrive needs data for
//   // hyperdrive will defer read calls based on the expectation that data will arrive soon
//   // since the data will never come, this is a good opportunity for us to test the stat timeout

//   var startTime = Date.now()
//   try {
//     await pda.stat(archive, '/foo', {timeout: 500})
//     t.fail('Should have thrown')
//   } catch (e) {
//     t.truthy(e.timedOut)
//     t.truthy((Date.now() - startTime) < 1e3)
//   }
// })