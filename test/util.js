const co = require('co')
const hyperdrive = require('hyperdrive')
const hyperstaging = require('hyperdrive-staging-area')
const fs = require('fs')
const os = require('os')
const path = require('path')

const FAKE_DAT_KEY = 'f'.repeat(64)

function createArchive (names, {staging} = {}) {
  names = names || []
  var archive = hyperdrive(tmpdir())
  var target = archive
  if (staging) {
    archive.staging = hyperstaging(archive, tmpdir())
    target = archive.staging
  }
  return co(function* () {
    for (var i = 0; i < names.length; i++) {
      let name = names[i]
      let content = 'content'
      if (typeof name === 'object') {
        content = name.content
        name = name.name
      }

      yield new Promise(resolve => {
        if (name.slice(-1) === '/') {
          target.mkdir(name, resolve)
        } else {
          target.writeFile(name, content, resolve)
        }
      })
    }
  }).then(() => new Promise(resolve => {
    if (staging) {
      archive.staging.commit((err, changes) => resolve(archive))
    } else {
      resolve(archive)
    }
  }))
}

function tmpdir () {
  return fs.mkdtempSync(os.tmpdir() + path.sep + 'pauls-dat-api-test-')
}

module.exports = {FAKE_DAT_KEY, createArchive, tmpdir}
