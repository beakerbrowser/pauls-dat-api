const test = require('ava')
const fs = require('fs')
const Dat = require('dat-node')
const tutil = require('./util')
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

test('work with dat-node', async t => {
  var dir = tutil.tmpdir()
  var dat = await new Promise(resolve => Dat(tutil.drive, {dir}, (err, dat) => resolve(dat)))
  t.deepEqual(Object.keys(await pda.listFiles(dat, '/')), [])
})
