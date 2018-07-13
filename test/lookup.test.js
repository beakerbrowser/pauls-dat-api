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

// without preceding slashes w/fs
// =

stat.title = (_, given, expected) => `stat(${given}) is ${expected ? 'found' : 'not found'} (fs)`
test('create archive w/fs', async t => {
  target = await tutil.createFs([
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

// with preceding slashes w/fs
// =

stat.title = (_, given, expected) => `stat(${given}) is ${expected ? 'found' : 'not found'} (fs)`
test('create archive w/fs', async t => {
  target = await tutil.createFs([
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

// etc
// =

test('files have metadata, folders have no metadata', async t => {
  target = await tutil.createArchive([
    '/foo',
    '/subdir/',
    '/subdir/bar',
    '/baz'
  ])

  var st = await pda.stat(target, '/foo')
  t.is(st.isDirectory(), false)
  t.is(st.isFile(), true)
  t.truthy(st.downloaded > 0)
  t.truthy(st.blocks > 0)
  t.truthy(st.size > 0)

  var st = await pda.stat(target, '/subdir')
  t.is(st.isDirectory(), true)
  t.is(st.isFile(), false)
  t.is(st.downloaded, 0)
  t.is(st.blocks, 0)
  t.is(st.size, 0)
})

