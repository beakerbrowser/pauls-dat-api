const test = require('ava')
const fs = require('fs')
const Dat = require('dat-node')
const tutil = require('./util')
const pda = require('../index')

test('work with dat-node', async t => {
  var dat = await new Promise(resolve => Dat(tutil.tmpdir(), (err, dat) => resolve(dat)))
  t.deepEqual(Object.keys(await pda.readdir(dat, '/')), [])
})
