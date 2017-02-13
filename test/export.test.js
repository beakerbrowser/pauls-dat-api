const test = require('ava')
const fs = require('fs')
const path = require('path')
const tutil = require('./util')
const pda = require('../index')

test('exportFilesystemToArchive', async t => {
  const srcPath = tutil.tmpdir()
  fs.writeFileSync(path.join(srcPath, 'foo.txt'), 'content')
  fs.writeFileSync(path.join(srcPath, 'bar.data'), Buffer.from([0x00, 0x01]))
  fs.mkdirSync(path.join(srcPath, 'subdir'))
  fs.writeFileSync(path.join(srcPath, 'subdir', 'foo.txt'), 'content')
  fs.writeFileSync(path.join(srcPath, 'subdir', 'bar.data'), Buffer.from([0x00, 0x01]))

  const dstArchive = await tutil.createArchive()

  // initial import
  // =

  const statsA = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    inplaceImport: true
  })
  var expectedAddedA = ['foo.txt', 'bar.data', 'subdir/foo.txt', 'subdir/bar.data'].map(n => path.join(srcPath, n))
  statsA.addedFiles.sort(); expectedAddedA.sort()
  t.deepEqual(statsA.addedFiles, expectedAddedA)
  t.deepEqual(statsA.updatedFiles, [])
  t.deepEqual(statsA.skipCount, 0)
  t.deepEqual(statsA.fileCount, 4)

  // no changes
  // =

  const statsB = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    inplaceImport: true
  })
  t.deepEqual(statsB.addedFiles, [])
  t.deepEqual(statsB.updatedFiles, [])
  t.deepEqual(statsB.skipCount, 4)
  t.deepEqual(statsB.fileCount, 4)

  // make changes
  // =

  fs.writeFileSync(path.join(srcPath, 'foo.txt'), 'new content')
  fs.writeFileSync(path.join(srcPath, 'subdir', 'bar.data'), Buffer.from([0x01, 0x02, 0x03, 0x04]))
  fs.mkdirSync(path.join(srcPath, 'subdir2'))
  fs.writeFileSync(path.join(srcPath, 'subdir2', 'foo.txt'), 'content')

  // 2 changes, 1 addition (dry run)
  // =

  const statsC = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    inplaceImport: true,
    dryRun: true
  })
  var expectedAddedC = ['subdir2/foo.txt'].map(n => path.join(srcPath, n))
  statsC.addedFiles.sort(); expectedAddedC.sort()
  t.deepEqual(statsC.addedFiles, expectedAddedC)
  var expectedUpdatedC = ['foo.txt', 'subdir/bar.data'].map(n => path.join(srcPath, n))
  statsC.updatedFiles.sort(); expectedUpdatedC.sort()
  t.deepEqual(statsC.updatedFiles, expectedUpdatedC)
  t.deepEqual(statsC.skipCount, 2)
  t.deepEqual(statsC.fileCount, 5)

  // 2 changes, 1 addition (real run)
  // =

  const statsD = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    inplaceImport: true
  })
  var expectedAddedD = ['subdir2/foo.txt'].map(n => path.join(srcPath, n))
  statsD.addedFiles.sort(); expectedAddedD.sort()
  t.deepEqual(statsD.addedFiles, expectedAddedD)
  var expectedUpdatedD = ['foo.txt', 'subdir/bar.data'].map(n => path.join(srcPath, n))
  statsD.updatedFiles.sort(); expectedUpdatedD.sort()
  t.deepEqual(statsD.updatedFiles, expectedUpdatedD)
  t.deepEqual(statsD.skipCount, 2)
  t.deepEqual(statsD.fileCount, 5)

  // into subdir
  // =

  const statsE = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    dstPath: '/subdir3',
    inplaceImport: true
  })
  var expectedAddedE = ['foo.txt', 'bar.data', 'subdir/foo.txt', 'subdir/bar.data', 'subdir2/foo.txt'].map(n => path.join(srcPath, n))
  statsE.addedFiles.sort(); expectedAddedE.sort()
  t.deepEqual(statsE.addedFiles, expectedAddedE)
  t.deepEqual(statsE.updatedFiles, [])
  t.deepEqual(statsE.skipCount, 0)
  t.deepEqual(statsE.fileCount, 12)
})

test('exportArchiveToFilesystem', async t => {
  const srcArchive = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) },
  ])

  const dstPathA = tutil.tmpdir()
  const dstPathB = tutil.tmpdir()

  // export all
  // =

  const statsA = await pda.exportArchiveToFilesystem({
    srcArchive,
    dstPath: dstPathA
  })

  const expectedAddedFilesA = ['foo.txt', 'bar.data', 'subdir/foo.txt', 'subdir/bar.data'].map(n => path.join(dstPathA, n))
  statsA.addedFiles.sort(); expectedAddedFilesA.sort()
  t.deepEqual(statsA.addedFiles, expectedAddedFilesA)
  t.deepEqual(statsA.updatedFiles, [])
  t.deepEqual(statsA.fileCount, 4)

  // fail export
  // =

  const errorA = await t.throws(pda.exportArchiveToFilesystem({
    srcArchive,
    dstPath: dstPathA
  }))
  t.truthy(errorA.destDirectoryNotEmpty)

  // overwrite all
  // =

  const statsB = await pda.exportArchiveToFilesystem({
    srcArchive,
    dstPath: dstPathA,
    overwriteExisting: true
  })

  statsB.updatedFiles.sort()
  t.deepEqual(statsB.addedFiles, [])
  t.deepEqual(statsB.updatedFiles, expectedAddedFilesA)
  t.deepEqual(statsB.fileCount, 4)

  // export subdir
  // =

  const statsC = await pda.exportArchiveToFilesystem({
    srcArchive,
    dstPath: dstPathB,
    srcPath: '/subdir'
  })

  const expectedAddedFilesC = ['foo.txt', 'bar.data'].map(n => path.join(dstPathB, n))
  statsC.addedFiles.sort(); expectedAddedFilesC.sort()
  t.deepEqual(statsC.addedFiles, expectedAddedFilesC)
  t.deepEqual(statsC.updatedFiles, [])
  t.deepEqual(statsC.fileCount, 2)
})

test('exportArchiveToArchive', async t => {
  const srcArchiveA = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) },
  ])

  const dstArchiveA = await tutil.createArchive()
  const dstArchiveB = await tutil.createArchive()
  const dstArchiveC = await tutil.createArchive()
  const dstArchiveD = await tutil.createArchive()

  // export all
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveA
  })

  t.deepEqual(Object.keys(await pda.listFiles(dstArchiveA, '/')).sort(), ['bar.data', 'foo.txt', 'subdir'])
  t.deepEqual(Object.keys(await pda.listFiles(dstArchiveA, '/subdir')).sort(), ['bar.data', 'foo.txt'])

  // export from subdir
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveB,
    srcPath: '/subdir'
  })

  t.deepEqual(Object.keys(await pda.listFiles(dstArchiveB, '/')).sort(), ['bar.data', 'foo.txt'])

  // export to subdir
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveC,
    dstPath: '/gpdir'
  })

  t.deepEqual(Object.keys(await pda.listFiles(dstArchiveC, '/')).sort(), ['gpdir'])
  t.deepEqual(Object.keys(await pda.listFiles(dstArchiveC, '/gpdir')).sort(), ['bar.data', 'foo.txt', 'subdir'])
  t.deepEqual(Object.keys(await pda.listFiles(dstArchiveC, '/gpdir/subdir')).sort(), ['bar.data', 'foo.txt'])

  // export from subdir to subdir
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveD,
    srcPath: '/subdir',
    dstPath: '/gpdir'
  })

  t.deepEqual(Object.keys(await pda.listFiles(dstArchiveD, '/')).sort(), ['gpdir'])
  t.deepEqual(Object.keys(await pda.listFiles(dstArchiveD, '/gpdir')).sort(), ['bar.data', 'foo.txt'])
})