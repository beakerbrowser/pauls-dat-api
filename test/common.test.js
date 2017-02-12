const test = require('ava')
const pda = require('../index')

test('normalizeEntry', t => {
  t.deepEqual(pda.normalizeEntryName('foo'), '/foo')
  t.deepEqual(pda.normalizeEntryName({ name: 'foo' }), '/foo')
  t.deepEqual(pda.normalizeEntryName({ name: '/foo' }), '/foo')
  t.deepEqual(pda.normalizeEntryName({ name: 'foo/bar' }), '/foo/bar')
  t.deepEqual(pda.normalizeEntryName({ name: '/foo/bar' }), '/foo/bar')
})

test('isPathChild', t => {
  t.deepEqual(pda.isPathChild([], ['foo']), true)
  t.deepEqual(pda.isPathChild(['foo'], ['foo']), true)
  t.deepEqual(pda.isPathChild(['foo'], ['foo', 'bar']), true)
  t.deepEqual(pda.isPathChild(['foo'], ['foo', 'bar', 'baz']), true)
  t.deepEqual(pda.isPathChild(['foo', 'bar'], ['foo', 'bar', 'baz']), true)
  t.deepEqual(pda.isPathChild(['foo'], ['fuz', 'bar', 'baz']), false)
  t.deepEqual(pda.isPathChild(['foo', 'bar'], ['fuz', 'bar', 'baz']), false)
  t.deepEqual(pda.isPathChild(['foo', 'bar'], ['foo', 'bur', 'baz']), false)
})