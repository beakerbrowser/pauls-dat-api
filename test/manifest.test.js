const test = require('ava')
const tutil = require('./util')
const pda = require('../index')

test('read/write/update manifest', async t => {
  var archive = await tutil.createArchive([])
  await new Promise(resolve => archive.ready(resolve))

  await pda.writeManifest(archive, {
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    title: 'My Dat',
    description: 'This dat has a manifest!'
  })

  t.deepEqual(await pda.readManifest(archive), {
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    title: 'My Dat',
    description: 'This dat has a manifest!'    
  })

  await pda.updateManifest(archive, {
    title: 'My Dat!!'
  })

  t.deepEqual(await pda.readManifest(archive), {
    url: `dat://${tutil.FAKE_DAT_KEY}`,
    title: 'My Dat!!',
    description: 'This dat has a manifest!'    
  })
})
