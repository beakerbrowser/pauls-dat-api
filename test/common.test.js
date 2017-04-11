const test = require('ava')
const fs = require('fs')
// const Dat = require('dat-node')
const tutil = require('./util')
const pda = require('../index')

// TODO
// test('work with dat-node', async t => {
//   var dir = tutil.tmpdir()
//   var dat = await new Promise(resolve => Dat(tutil.drive, {dir}, (err, dat) => resolve(dat)))
//   t.deepEqual(Object.keys(await pda.listFiles(dat, '/')), [])
// })
