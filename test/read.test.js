const test = require('ava')
const {NotFoundError, NotAFileError} = require('beaker-error-constants')
const tutil = require('./util')
const pda = require('../index')

var target
async function readTest (t, path, expected, errorTests) {
  try {
    var data = await pda.readFile(target, path, Buffer.isBuffer(expected) ? 'binary' : 'utf8')
    t.deepEqual(data, expected)
  } catch (e) {
    if (errorTests) errorTests(t, e)
    else throw e
  }
}

readTest.title = (_, path) => `readFile(${path}) test`
test('create archive', async t => {
  target = await tutil.createArchive([
    'foo',
    'foo2/',
    'foo2/bar',
    { name: 'baz', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) },
    'dir/'
  ])
})

test(readTest, 'foo', 'content')
test(readTest, '/foo', 'content')
test(readTest, 'foo2/bar', 'content')
test(readTest, '/foo2/bar', 'content')
test(readTest, 'baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
test(readTest, '/baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
test(readTest, 'doesnotexist', null, (t, err) => {
  t.truthy(err instanceof NotFoundError)
  t.truthy(err.notFound)
})
test(readTest, 'dir/', null, (t, err) => {
  t.truthy(err instanceof NotAFileError)
  t.truthy(err.notAFile)
})

readTest.title = (_, path) => `readFile(${path}) test (w/staging)`
test('create archive w/staging', async t => {
  target = (await tutil.createArchive([
    'foo',
    'foo2/',
    'foo2/bar',
    { name: 'baz', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) },
    'dir/'
  ], {staging: true})).staging
})

test(readTest, 'foo', 'content')
test(readTest, '/foo', 'content')
test(readTest, 'foo2/bar', 'content')
test(readTest, '/foo2/bar', 'content')
test(readTest, 'baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
test(readTest, '/baz', Buffer.from([0x00, 0x01, 0x02, 0x03]))
test(readTest, 'doesnotexist', null, (t, err) => {
  t.truthy(err instanceof NotFoundError)
  t.truthy(err.notFound)
})
test(readTest, 'dir/', null, (t, err) => {
  t.truthy(err instanceof NotAFileError)
  t.truthy(err.notAFile)
})

test('readFile encodings', async t => {
  var archive = await tutil.createArchive([
    { name: 'buf', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) }
  ])

  await t.deepEqual(await pda.readFile(archive, 'buf', 'binary'), Buffer.from([0x00, 0x01, 0x02, 0x03]))
  await t.deepEqual(await pda.readFile(archive, 'buf', 'hex'), '00010203')
  await t.deepEqual(await pda.readFile(archive, 'buf', 'base64'), 'AAECAw==')
})

test('readFile encodings w/staging', async t => {
  var archive = await tutil.createArchive([
    { name: 'buf', content: Buffer.from([0x00, 0x01, 0x02, 0x03]) }
  ], {staging: true})

  await t.deepEqual(await pda.readFile(archive.staging, 'buf', 'binary'), Buffer.from([0x00, 0x01, 0x02, 0x03]))
  await t.deepEqual(await pda.readFile(archive.staging, 'buf', 'hex'), '00010203')
  await t.deepEqual(await pda.readFile(archive.staging, 'buf', 'base64'), 'AAECAw==')
})

test('readdir', async t => {
  var archive = await tutil.createArchive([
    'foo/',
    'foo/bar',
    'baz'
  ])

  t.deepEqual(await pda.readdir(archive, ''), ['foo', 'baz'])
  t.deepEqual(await pda.readdir(archive, '/'), ['foo', 'baz'])
  t.deepEqual(await pda.readdir(archive, 'foo'), ['bar'])
  t.deepEqual(await pda.readdir(archive, '/foo'), ['bar'])
  t.deepEqual(await pda.readdir(archive, '/foo/'), ['bar'])
})

test('readdir w/staging', async t => {
  var archive = await tutil.createArchive([
    'foo/',
    'foo/bar',
    'baz'
  ], {staging: true})

  t.deepEqual((await pda.readdir(archive.staging, '')).sort(), ['baz', 'foo'])
  t.deepEqual((await pda.readdir(archive.staging, '/')).sort(), ['baz', 'foo'])
  t.deepEqual(await pda.readdir(archive.staging, 'foo'), ['bar'])
  t.deepEqual(await pda.readdir(archive.staging, '/foo'), ['bar'])
  t.deepEqual(await pda.readdir(archive.staging, '/foo/'), ['bar'])
})

test('readdir recursive', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/c/',
    'c/',
    'c/a',
    'c/b'
  ])

  t.deepEqual((await pda.readdir(archive, '/', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b',
    'b/a',
    'b/b',
    'b/b/a',
    'b/b/b',
    'b/c',
    'c',
    'c/a',
    'c/b'
  ])

  t.deepEqual((await pda.readdir(archive, '/b', {recursive: true})).map(tutil.tonix).map(stripPrecedingSlash).sort(), [
    'a',
    'b',
    'b/a',
    'b/b',
    'c'
  ])

  t.deepEqual((await pda.readdir(archive, '/b/b', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b'
  ])

  t.deepEqual((await pda.readdir(archive, '/c', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b'
  ])
})

test('readdir recursive w/staging', async t => {
  var archive = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/c/',
    'c/',
    'c/a',
    'c/b'
  ], {staging: true})

  t.deepEqual((await pda.readdir(archive.staging, '/', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b',
    'b/a',
    'b/b',
    'b/b/a',
    'b/b/b',
    'b/c',
    'c',
    'c/a',
    'c/b'
  ])

  t.deepEqual((await pda.readdir(archive.staging, '/b', {recursive: true})).map(tutil.tonix).map(stripPrecedingSlash).sort(), [
    'a',
    'b',
    'b/a',
    'b/b',
    'c'
  ])

  t.deepEqual((await pda.readdir(archive.staging, '/b/b', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b'
  ])

  t.deepEqual((await pda.readdir(archive.staging, '/c', {recursive: true})).map(tutil.tonix).sort(), [
    'a',
    'b'
  ])
})

test('readSize', async t => {
  var archive1 = await tutil.createArchive([
    'a'
  ])
  var archive2 = await tutil.createArchive([
    'a',
    'b/',
    'b/a',
    'b/b/',
    'b/b/a',
    'b/b/b',
    'b/c/',
    'c/',
    'c/a',
    'c/b'
  ])

  var size1 = await pda.readSize(archive1, '/')
  var size2 = await pda.readSize(archive2, '/')

  t.truthy(size1 > 0)
  t.truthy(size2 > 0)
  t.truthy(size2 > size1)

  var size3 = await pda.readSize(archive2, '/b')

  t.truthy(size3 > 0)
})

{
  test('createReaddirStream › regular', async t => {
    const archive = await tutil.createArchive([
      'a',
      'b',
      'c/',
      'c/a'
    ])

    await compareStreamEntries(
      t,
      pda.createReaddirStream(archive),
      ['/a', '/b', '!/c']
    )
    await compareStreamEntries(
      t,
      pda.createReaddirStream(archive, ''),
      ['a', 'b', '!c']
    )
  })

  test('createReaddirStream › single hierarchy', async t => {
    const archive = await tutil.createArchive([
      'a',
      'b',
      'c'
    ])

    await compareStreamEntries(
      t,
      pda.createReaddirStream(archive),
      ['/a', '/b', '/c']
    )
  })

  test('createReaddirStream › recursive', async t => {
    const archive = await tutil.createArchive([
      'a',
      'b',
      'c/',
      'c/a',
      'd'
    ])

    await compareStreamEntries(
      t,
      pda.createReaddirStream(archive, {recursive: true}),
      ['/a', '/b', '!/c', '/d', '/c/a']
    )
  })

  test('createReaddirStream › recursive + depthFirst', async t => {
    const archive = await tutil.createArchive([
      'a',
      'b',
      'c/',
      'c/x/',
      'c/x/1',
      'c/y',
      'd'
    ])

    await compareStreamEntries(
      t,
      pda.createReaddirStream(archive, {recursive: true, depthFirst: true}),
      ['/a', '/b', '!/c', '!/c/x', '/c/x/1', '/c/y', '/d']
    )
  })

  test('createReaddirStream › recursive + maxDepth', async t => {
    const archive = await tutil.createArchive([
      'a/',
      'a/b',
      'a/c/',
      'a/c/d',
      'a/c/e/',
      'a/c/e/f',
      'o'
    ])

    // Default case = full depth
    await compareStreamEntries(
      t,
      pda.createReaddirStream(archive, {recursive: true}),
      [
        '!/a',
        '/o',
        '/a/b',
        '!/a/c',
        '/a/c/d',
        '!/a/c/e',
        '/a/c/e/f'
      ]
    )

    // One depth should be one past the current director (else you would need to switch recursive=false)
    await compareStreamEntries(
      t,
      pda.createReaddirStream(archive, {recursive: true, maxDepth: 1}),
      [
        '!/a',
        '/o',
        '/a/b',
        '!/a/c'
      ]
    )

    // Test with two levels
    await compareStreamEntries(
      t,
      pda.createReaddirStream(archive, {recursive: true, maxDepth: 2}),
      [
        '!/a',
        '/o',
        '/a/b',
        '!/a/c',
        '/a/c/d',
        '!/a/c/e'
      ]
    )
  })

  function compareStreamEntries (t, stream, entries) {
    return new Promise((resolve, reject) => {
      let current = 0
      stream.on('data', entry => {
        if (entries.length === current) {
          t.fail(`Unexpected entry ${entry}`)
          return
        }
        current = compareReaddirStreamEntry(t, entries, current, entry)
      })
      stream.on('error', reject)
      stream.on('end', () => {
        if (current < entries.length) {
          t.fail(`Missing ${entries.length - current} entries: [ ${entries.slice(current).map(entry => `'${entry}'`).join(', ')} ]`)
        } else {
          t.pass('all entries processed')
        }
        resolve()
      })
    })
  }
}

test('createReaddirStream › err .readdir', t => {
  const archive = {
    readdir (name, opts, cb) {
      t.is(name, '/')
      setImmediate(() => cb(new Error('error-test')))
    }
  }
  const stream = pda.createReaddirStream(archive)
  let errorCalled = false
  return new Promise(resolve => {
    stream.on('data', data => t.fail(`Unexpected data occured ${data}`))
    stream.on('error', e => {
      t.is(e.message, 'error-test')
      errorCalled = true
    })
    stream.on('end', () => {
      t.true(errorCalled, 'Error should have been called.')
      resolve()
    })
  })
})

test('createReaddirStream › err .stat', t => {
  const archive = {
    stat (name, cb) {
      t.is(name, '/x')
      setImmediate(() => cb(new Error('error-test')))
    },
    readdir (name, opts, cb) {
      setImmediate(() => cb(null, ['/x']))
    }
  }
  const stream = pda.createReaddirStream(archive)
  let errorCalled = false
  return new Promise(resolve => {
    stream.on('data', data => t.fail(`Unexpected data occured ${data}`))
    stream.on('error', e => {
      t.is(e.message, 'error-test')
      errorCalled = true
    })
    stream.on('end', () => {
      t.true(errorCalled, 'Error should have been called.')
      resolve()
    })
  })
})

test('createReaddirStream › destroy immediately', t => {
  const archive = {
    readdir (name, opts, cb) {
      setImmediate(() => cb(null, ['/x']))
    }
  }
  const stream = pda.createReaddirStream(archive)
  return new Promise((resolve, reject) => {
    stream.on('data', data => t.fail(`Unexpected data occured ${data}`))
    stream.on('error', reject)
    stream.on('end', resolve)
    stream.destroy()
  })
})

test('createReaddirStream › destroy after first read', t => {
  const archive = {
    stat (name, cb) {
      t.not(name, 'b/c', 'c is not expected as the stream should be destroyed by then')
      setImmediate(() => {
        cb(null, {
          isFile: () => name === 'a',
          isDirectory: () => name === 'b'
        })
      })
    },
    readdir (name, opts, cb) {
      let result
      if (name === '/') {
        result = ['a', 'b']
      } else if (name === 'b') {
        return cb(new Error(`Readdir called for unexpected ${name}`))
      }
      setImmediate(() => cb(null, result))
    }
  }
  return new Promise(resolve => {
    const stream = pda.createReaddirStream(archive)
    stream.on('data', data => {
      t.not(data, '/b/c')
      if (data === 'b') {
        stream.destroy()
      } else {
        t.is(data, '/a')
      }
    })
    stream.on('error', e => t.fail(e))
    stream.on('end', resolve)
    stream.destroy()
  })
})

test('createReaddirStream › pause', async t => {
  const archive = await tutil.createArchive([
    'a',
    'b',
    'c/',
    'c/x/',
    'c/x/1',
    'c/y',
    'd'
  ])

  await readWithPause(pda.createReaddirStream(archive, {recursive: true}), [
    ['/a', '/b', '!/c', '/d'],
    ['!/c/x', '/c/y'],
    ['/c/x/1']
  ])

  await readWithPause(pda.createReaddirStream(archive, {recursive: true, depthFirst: true}), [
    ['/a', '/b', '!/c'],
    ['!/c/x', '/c/x/1'],
    ['/c/y', '/d']
  ])

  function readWithPause (stream, blocks) {
    return new Promise(resolve => {
      let current = 0
      let blockNr = 0
      let entries = blocks.shift()
      stream.on('data', entry => {
        if (entries.length === current) {
          t.fail(`Unexpected entry ${entry} in block#${blockNr}`)
          return
        }
        current = compareReaddirStreamEntry(t, entries, current, entry)
        if (!stream.isPaused() && blocks.length > 0 && entries.length > 0) {
          stream.pause()
          setTimeout(() => {
            entries = entries.concat(blocks.shift())
            blockNr += 1
            stream.resume()
          }, 200)
        }
      })
      stream.on('error', e => t.fail(e))
      stream.on('end', resolve)
      stream.pause()
      setTimeout(() => stream.resume(), 200)
    })
  }
})

/*
test('createReaddirStream › huge tree', async t => {
  function createTree (result, root, depth) {
    for (let fileNo = 0; fileNo < 10; fileNo += 1) {
      result.push(`${root}file_${fileNo}`)
    }
    for (let dirNo = 0; dirNo < 3; dirNo += 1) {
      const name = `${root}dir_${dirNo}/`
      result.push(name)
      if (depth > 0) {
        createTree(result, name, depth - 1)
      }
    }
    return result
  }

  const startA = Date.now()
  const list = createTree([], '', 5)
  console.log(`${Date.now() - startA} ms for creating archive (${list.length})`)

  const startB = Date.now()
  const archive = await tutil.createArchive(list)
  console.log(`${Date.now() - startB} ms for creating archive (${list.length})`)

  const done = new Promise((resolve, reject) => {
    const stream = archive.createReaddirStream(archive)
    let count = 0
    stream.on('data', entry => {
      console.log(entry)
      if (count > 500) {
        stream.pause()
      }
      count += 1
    })
    stream.on('end', resolve)
  })
  await done
})
*/

function compareReaddirStreamEntry (t, entries, current, entry) {
  let expected = entries[current]
  const isDir = /^!/.test(expected)
  if (isDir) {
    expected = expected.substr(1)
  }
  t.deepEqual(entry.location, expected, `comparing entry ${current}`)
  if (isDir) {
    t.true(entry.stat.isDirectory(), `Expected #${current} - ${expected} to be a directory`)
  } else {
    t.true(entry.stat.isFile(), `Expected #${current} - ${expected} to be a file`)
  }
  return current + 1
}

function stripPrecedingSlash (str) {
  if (str.charAt(0) == '/') return str.slice(1)
  return str
}