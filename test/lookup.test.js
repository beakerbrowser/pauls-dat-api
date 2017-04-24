const test = require('ava')
const tutil = require('./util')
const pda = require('../index')

var target
async function stat (t, given, expected) {
  // run test
  try {
    var entry = await pda.stat(target, given)
  } catch (e) {}
  if (expected) {
    t.truthy(entry)
  } else {
    t.falsy(entry)
  }
}

// without preceding slashes
// =

stat.title = (_, given, expected) => `stat(${given}) is ${expected ? 'found' : 'not found'}`
test('create archive', async t => {
  target = await tutil.createArchive([
    'foo',
    'subdir/',
    'subdir/bar',
    'baz'
  ])
})

test(stat, 'foo', true)
test(stat, '/foo', true)
test(stat, 'subdir/bar', true)
test(stat, '/subdir/bar', true)
test(stat, 'baz', true)
test(stat, '/baz', true)
test(stat, 'notfound', false)

// with preceding slashes
// =

stat.title = (_, given, expected) => `stat(${given}) is ${expected ? 'found' : 'not found'}`
test('create archive', async t => {
  target = await tutil.createArchive([
    '/foo',
    '/subdir/',
    '/subdir/bar',
    '/baz'
  ])
})

test(stat, 'foo', true)
test(stat, '/foo', true)
test(stat, 'subdir/bar', true)
test(stat, '/subdir/bar', true)
test(stat, 'baz', true)
test(stat, '/baz', true)
test(stat, 'notfound', false)

// without preceding slashes w/staging
// =

stat.title = (_, given, expected) => `stat(${given}) is ${expected ? 'found' : 'not found'} (staging)`
test('create archive w/staging', async t => {
  target = await tutil.createArchive([
    'foo',
    'subdir/',
    'subdir/bar',
    'baz'
  ], {staging: true})
})

test(stat, 'foo', true)
test(stat, '/foo', true)
test(stat, 'subdir/bar', true)
test(stat, '/subdir/bar', true)
test(stat, 'baz', true)
test(stat, '/baz', true)
test(stat, 'notfound', false)

// with preceding slashes w/staging
// =

stat.title = (_, given, expected) => `stat(${given}) is ${expected ? 'found' : 'not found'} (staging)`
test('create archive w/staging', async t => {
  target = (await tutil.createArchive([
    '/foo',
    '/subdir/',
    '/subdir/bar',
    '/baz'
  ], {staging: true})).staging
})

test(stat, 'foo', true)
test(stat, '/foo', true)
test(stat, 'subdir/bar', true)
test(stat, '/subdir/bar', true)
test(stat, 'baz', true)
test(stat, '/baz', true)
test(stat, 'notfound', false)
