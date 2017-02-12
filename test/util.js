const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const fs = require('fs')
const os = require('os')
const path = require('path')

const FAKE_DAT_KEY = 'f'.repeat(64)
const drive = hyperdrive(memdb())

function createArchive (names) {
  var promises = []
  const archive = drive.createArchive()
  names.forEach(name => {
    var content = 'content'
    if (typeof name === 'object') {
      content = name.content
      name = name.name
    }

    promises.push(new Promise(resolve => {
      const ws = archive.createFileWriteStream(name)
      ws.write(content)
      ws.end()
      ws.once('finish', resolve)
    }))
  })
  return Promise.all(promises).then(() => archive)
}

function tmpdir () {
  return fs.mkdtempSync(os.tmpdir() + path.sep + 'pauls-dat-api-test-')
}

module.exports = {FAKE_DAT_KEY, drive, createArchive, tmpdir}