const hyperdrive = require('hyperdrive')
const ScopedFS = require('scoped-fs')
const fs = require('fs')
const os = require('os')
const path = require('path')

const FAKE_DAT_KEY = 'f'.repeat(64)

function createArchive (names) {
  return populate(hyperdrive(tmpdir()), names)
}

function createFs (names) {
  return populate(new ScopedFS(tmpdir()), names)
}

async function populate (target, names) {
  names = names || []
  for (var i = 0; i < names.length; i++) {
    let name = names[i]
    let content = 'content'
    if (typeof name === 'object') {
      content = name.content
      name = name.name
    }

    await new Promise(resolve => {
      if (name.slice(-1) === '/') {
        target.mkdir(name, resolve)
      } else {
        target.writeFile(name, content, resolve)
      }
    })
  }

  return target
}

function tmpdir () {
  return fs.mkdtempSync(os.tmpdir() + path.sep + 'pauls-dat-api-test-')
}

function tonix (str) {
  return str.replace(/\\/g, '/')
}

module.exports = {FAKE_DAT_KEY, createArchive, createFs, tmpdir, tonix}
