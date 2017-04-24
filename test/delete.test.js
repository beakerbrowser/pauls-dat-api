const test = require('ava')
const hyperdrive = require('hyperdrive')
const tutil = require('./util')
const pda = require('../index')

test('unlink', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'c/',
    'c/b/',
    'c/b/a'
  ])

  await pda.unlink(archive, '/a')
  await t.throws(pda.stat(archive, '/a'))
  await pda.unlink(archive, 'b/a')
  await t.throws(pda.stat(archive, 'b/a'))
  await pda.unlink(archive, '/c/b/a')
  await t.throws(pda.stat(archive, '/c/b/a'))
  t.deepEqual((await pda.readdir(archive, '/', {recursive: true})).sort(), ['b', 'c', 'c/b'])
})

test('unlink NotFoundError, NotAFileError', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'c/',
    'c/b/',
    'c/b/a'
  ])

  const err1 = await t.throws(pda.unlink(archive, '/bar'))
  t.truthy(err1.notFound)
  const err2 = await t.throws(pda.unlink(archive, '/b'))
  t.truthy(err2.notAFile)
})

test('rmdir', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a/',
    'c/',
    'c/b/'
  ])

  await pda.rmdir(archive, 'b/a')
  await pda.rmdir(archive, 'b')
  await pda.rmdir(archive, 'c/b')
  t.deepEqual((await pda.readdir(archive, '/', {recursive: true})).sort(), ['a', 'c'])
})

test('rmdir recursive', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a/',
    'b/b',
    'b/c',
    'b/d/',
    'b/d/a',
    'b/d/b',
    'b/d/c/',
    'b/d/c/a',
    'b/d/c/b',
    'b/d/d',
    'c/',
    'c/b/'
  ])

  await pda.rmdir(archive, 'b', {recursive: true})
  t.deepEqual((await pda.readdir(archive, '/', {recursive: true})).sort(), ['a', 'c', 'c/b'])
})

test('rmdir NotFoundError, NotAFolderError, DestDirectoryNotEmpty', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a/',
    'c/',
    'c/b/'
  ])

  const err1 = await t.throws(pda.rmdir(archive, '/bar'))
  t.truthy(err1.notFound)
  const err2 = await t.throws(pda.rmdir(archive, '/a'))
  t.truthy(err2.notAFolder)
  const err3 = await t.throws(pda.rmdir(archive, '/b'))
  t.truthy(err3.destDirectoryNotEmpty)
})

test('ArchiveNotWritableError', async t => {
  const archive = hyperdrive(tutil.tmpdir(), tutil.FAKE_DAT_KEY, {createIfMissing: false})
  await new Promise(resolve => archive.ready(resolve))

  const err1 = await t.throws(pda.unlink(archive, '/bar'))
  t.truthy(err1.archiveNotWritable)
  const err2 = await t.throws(pda.rmdir(archive, '/bar'))
  t.truthy(err2.archiveNotWritable)
})

test('unlink w/staging', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'c/',
    'c/b/',
    'c/b/a'
  ], {staging: true})

  await pda.unlink(archive.staging, '/a')
  await t.throws(pda.stat(archive.staging, '/a'))
  await pda.unlink(archive.staging, 'b/a')
  await t.throws(pda.stat(archive.staging, 'b/a'))
  await pda.unlink(archive.staging, '/c/b/a')
  await t.throws(pda.stat(archive.staging, '/c/b/a'))
  t.deepEqual((await pda.readdir(archive.staging, '/', {recursive: true})).sort(), ['b', 'c', 'c/b'])

  await pda.commit(archive.staging)
  await t.throws(pda.stat(archive, '/a'))
  await t.throws(pda.stat(archive, 'b/a'))
  await t.throws(pda.stat(archive, '/c/b/a'))
  t.deepEqual((await pda.readdir(archive, '/', {recursive: true})).sort(), ['b', 'c', 'c/b'])
})

test('unlink NotFoundError, NotAFileError w/staging', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'c/',
    'c/b/',
    'c/b/a'
  ], {staging: true})

  const err1 = await t.throws(pda.unlink(archive.staging, '/bar'))
  t.truthy(err1.notFound)
  const err2 = await t.throws(pda.unlink(archive.staging, '/b'))
  t.truthy(err2.notAFile)
})

test('rmdir w/staging', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a/',
    'c/',
    'c/b/'
  ], {staging: true})

  await pda.rmdir(archive.staging, 'b/a')
  await pda.rmdir(archive.staging, 'b')
  await pda.rmdir(archive.staging, 'c/b')
  t.deepEqual((await pda.readdir(archive.staging, '/', {recursive: true})).sort(), ['a', 'c'])

  await pda.commit(archive.staging)
  t.deepEqual((await pda.readdir(archive, '/', {recursive: true})).sort(), ['a', 'c'])
})

test('rmdir recursive w/staging', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a/',
    'b/b',
    'b/c',
    'b/d/',
    'b/d/a',
    'b/d/b',
    'b/d/c/',
    'b/d/c/a',
    'b/d/c/b',
    'b/d/d',
    'c/',
    'c/b/'
  ], {staging: true})

  await pda.rmdir(archive.staging, 'b', {recursive: true})
  t.deepEqual((await pda.readdir(archive.staging, '/', {recursive: true})).sort(), ['a', 'c', 'c/b'])

  await pda.commit(archive.staging)
  t.deepEqual((await pda.readdir(archive, '/', {recursive: true})).sort(), ['a', 'c', 'c/b'])
})

test('rmdir NotFoundError, NotAFolderError, DestDirectoryNotEmpty w/staging', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a/',
    'c/',
    'c/b/'
  ], {staging: true})

  const err1 = await t.throws(pda.rmdir(archive.staging, '/bar'))
  t.truthy(err1.notFound)
  const err2 = await t.throws(pda.rmdir(archive.staging, '/a'))
  t.truthy(err2.notAFolder)
  const err3 = await t.throws(pda.rmdir(archive.staging, '/b'))
  t.truthy(err3.destDirectoryNotEmpty)
})
