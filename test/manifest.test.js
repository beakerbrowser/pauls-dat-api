const test = require('ava')
const tutil = require('./util')
const pda = require('../index')

test('read/write/update manifest', async t => {
  var archive = await tutil.createArchive([])
  await new Promise(resolve => archive.ready(resolve))

  await pda.writeManifest(archive, {
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    title: 'My Dat',
    description: 'This dat has a manifest!',
    type: 'foo bar',
    repository: 'https://github.com/pfrazee/pauls-dat-api.git',
    author: {
      name: 'Bob',
      url: 'dat://ffffffffffffffffffffffffffffffff'
    }
  })

  t.deepEqual(await pda.readManifest(archive), {
    title: 'My Dat',
    description: 'This dat has a manifest!',
    type: ['foo', 'bar'],
    repository: 'https://github.com/pfrazee/pauls-dat-api.git',
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    author: {
      name: 'Bob',
      url: 'dat://ffffffffffffffffffffffffffffffff'
    }
  })

  await pda.updateManifest(archive, {
    title: 'My Dat!!',
    type: 'foo'
  })

  t.deepEqual(await pda.readManifest(archive), {
    title: 'My Dat!!',
    description: 'This dat has a manifest!',
    type: ['foo'],
    repository: 'https://github.com/pfrazee/pauls-dat-api.git',
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    author: {
      name: 'Bob',
      url: 'dat://ffffffffffffffffffffffffffffffff'
    }
  })

  await pda.updateManifest(archive, {
    author: 'Robert'
  })

  t.deepEqual(await pda.readManifest(archive), {
    title: 'My Dat!!',
    description: 'This dat has a manifest!',
    type: ['foo'],
    repository: 'https://github.com/pfrazee/pauls-dat-api.git',
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    author: {
      name: 'Robert'
    }
  })

  await pda.updateManifest(archive, {
    author: 'dat://ffffffffffffffffffffffffffffffff'
  })

  t.deepEqual(await pda.readManifest(archive), {
    title: 'My Dat!!',
    description: 'This dat has a manifest!',
    type: ['foo'],
    repository: 'https://github.com/pfrazee/pauls-dat-api.git',
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    author: {
      url: 'dat://ffffffffffffffffffffffffffffffff'
    }
  })
})

test('read/write/update manifest w/staging', async t => {
  var archive = await tutil.createArchive([], {staging: true})
  await new Promise(resolve => archive.ready(resolve))

  await pda.writeManifest(archive.staging, {
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    title: 'My Dat',
    description: 'This dat has a manifest!'
  })

  t.deepEqual(await pda.readManifest(archive.staging), {
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    title: 'My Dat',
    description: 'This dat has a manifest!'
  })

  await pda.updateManifest(archive.staging, {
    title: 'My Dat!!'
  })

  t.deepEqual(await pda.readManifest(archive.staging), {
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    title: 'My Dat!!',
    description: 'This dat has a manifest!'
  })
})
