const co = require('co')
const hyperdrive = require('hyperdrive')
const fs = require('fs')
const os = require('os')
const path = require('path')

const FAKE_DAT_KEY = 'f'.repeat(64)

function createArchive (names) {
  names = names || []
  var promises = []
  const archive = hyperdrive(tmpdir())
  return co(function* () {
    for (var i=0; i < names.length; i++) {
      let name = names[i]
      let content = 'content'
      if (typeof name === 'object') {
        content = name.content
        name = name.name
      }

      yield new Promise(resolve => {
        if (name.slice(-1) === '/') {
          archive.mkdir(name, resolve)
        } else {
          archive.writeFile(name, content, resolve)
        }
      })
    }
  }).then(() => archive)
}

function tmpdir () {
  return fs.mkdtempSync(os.tmpdir() + path.sep + 'pauls-dat-api-test-')
}

module.exports = {FAKE_DAT_KEY, createArchive, tmpdir}