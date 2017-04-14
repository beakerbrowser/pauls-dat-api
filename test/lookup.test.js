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