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
  await new Promise(resolve => dstArchive.ready(resolve))

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

  // 2 changes, 2 additions (dry run)
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

  // 2 changes, 2 additions (real run)
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
  t.deepEqual(statsE.fileCount, 5)

  // into bad dest
  // =

  await t.throws(pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    dstPath: '/bad/subdir',
    inplaceImport: true
  }))
  await t.throws(pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    dstPath: '/bad/subdir'
  }))
  await t.throws(pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    dstPath: '/subdir3/foo.txt',
    inplaceImport: true
  }))
  await t.throws(pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    dstPath: '/subdir3/foo.txt'
  }))
})

test('exportFilesystemToArchive w/staging', async t => {
  const srcPath = tutil.tmpdir()
  fs.writeFileSync(path.join(srcPath, 'foo.txt'), 'content')
  fs.writeFileSync(path.join(srcPath, 'bar.data'), Buffer.from([0x00, 0x01]))
  fs.mkdirSync(path.join(srcPath, 'subdir'))
  fs.writeFileSync(path.join(srcPath, 'subdir', 'foo.txt'), 'content')
  fs.writeFileSync(path.join(srcPath, 'subdir', 'bar.data'), Buffer.from([0x00, 0x01]))

  const dstArchive = await tutil.createArchive([], {staging: true})
  await new Promise(resolve => dstArchive.ready(resolve))

  // initial import
  // =

  const statsA = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: dstArchive.staging,
    inplaceImport: true
  })
  var expectedAddedA = ['foo.txt', 'bar.data', 'subdir/foo.txt', 'subdir/bar.data'].map(n => path.join(srcPath, n))
  statsA.addedFiles.sort(); expectedAddedA.sort()
  t.deepEqual(statsA.addedFiles, expectedAddedA)
  t.deepEqual(statsA.updatedFiles, [])
  t.deepEqual(statsA.skipCount, 0)
  t.deepEqual(statsA.fileCount, 4)
  t.deepEqual((await pda.commit(dstArchive.staging)).length, 5)

  // no changes
  // =

  const statsB = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: dstArchive.staging,
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

  // 2 changes, 2 additions (dry run)
  // =

  const statsC = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: dstArchive.staging,
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
  t.deepEqual((await pda.commit(dstArchive.staging)).length, 0)

  // 2 changes, 2 additions (real run)
  // =

  const statsD = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: dstArchive.staging,
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
  t.deepEqual((await pda.commit(dstArchive.staging)).length, 4)

  // into subdir
  // =

  const statsE = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: dstArchive.staging,
    dstPath: '/subdir3',
    inplaceImport: true
  })
  var expectedAddedE = ['foo.txt', 'bar.data', 'subdir/foo.txt', 'subdir/bar.data', 'subdir2/foo.txt'].map(n => path.join(srcPath, n))
  statsE.addedFiles.sort(); expectedAddedE.sort()
  t.deepEqual(statsE.addedFiles, expectedAddedE)
  t.deepEqual(statsE.updatedFiles, [])
  t.deepEqual(statsE.skipCount, 0)
  t.deepEqual(statsE.fileCount, 5)
  t.deepEqual((await pda.commit(dstArchive.staging)).length, 8)

  // into bad dest
  // =

  await t.throws(pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: dstArchive.staging,
    dstPath: '/bad/subdir',
    inplaceImport: true
  }))
  await t.throws(pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: dstArchive.staging,
    dstPath: '/bad/subdir'
  }))
  await t.throws(pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: dstArchive.staging,
    dstPath: '/subdir3/foo.txt',
    inplaceImport: true
  }))
  await t.throws(pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: dstArchive.staging,
    dstPath: '/subdir3/foo.txt'
  }))
})

test('exportArchiveToFilesystem', async t => {
  const srcArchive = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/',
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) }
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

test('exportArchiveToFilesystem w/staging', async t => {
  const srcArchive = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/',
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) }
  ], {staging: true})

  const dstPathA = tutil.tmpdir()
  const dstPathB = tutil.tmpdir()

  // export all
  // =

  const statsA = await pda.exportArchiveToFilesystem({
    srcArchive: srcArchive.staging,
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
    srcArchive: srcArchive.staging,
    dstPath: dstPathA
  }))
  t.truthy(errorA.destDirectoryNotEmpty)

  // overwrite all
  // =

  const statsB = await pda.exportArchiveToFilesystem({
    srcArchive: srcArchive.staging,
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
    srcArchive: srcArchive.staging,
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
    'subdir/',
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) }
  ])

  const dstArchiveA = await tutil.createArchive()
  const dstArchiveB = await tutil.createArchive()
  const dstArchiveC = await tutil.createArchive()
  const dstArchiveD = await tutil.createArchive()
  const dstArchiveE = await tutil.createArchive([
    {name: 'foo.txt', content: 'asdf'},
    'bar.data/',
    'subdir/',
    'subdir/foo.txt/',
    'subdir/bar.data/',
    'subdir/bar.data/hi',
    'otherfile.txt'
  ])

  await new Promise(resolve => dstArchiveA.ready(resolve))
  await new Promise(resolve => dstArchiveB.ready(resolve))
  await new Promise(resolve => dstArchiveC.ready(resolve))
  await new Promise(resolve => dstArchiveD.ready(resolve))
  await new Promise(resolve => dstArchiveE.ready(resolve))

  // export all
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveA
  })

  t.deepEqual((await pda.readdir(dstArchiveA, '/')).sort(), ['bar.data', 'foo.txt', 'subdir'])
  t.deepEqual((await pda.readdir(dstArchiveA, '/subdir')).sort(), ['bar.data', 'foo.txt'])

  // export from subdir
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveB,
    srcPath: '/subdir'
  })

  t.deepEqual((await pda.readdir(dstArchiveB, '/')).sort(), ['bar.data', 'foo.txt'])

  // export to subdir
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveC,
    dstPath: '/gpdir'
  })

  t.deepEqual((await pda.readdir(dstArchiveC, '/')).sort(), ['gpdir'])
  t.deepEqual((await pda.readdir(dstArchiveC, '/gpdir')).sort(), ['bar.data', 'foo.txt', 'subdir'])
  t.deepEqual((await pda.readdir(dstArchiveC, '/gpdir/subdir')).sort(), ['bar.data', 'foo.txt'])

  // export from subdir to subdir
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveD,
    srcPath: '/subdir',
    dstPath: '/gpdir'
  })

  t.deepEqual((await pda.readdir(dstArchiveD, '/')).sort(), ['gpdir'])
  t.deepEqual((await pda.readdir(dstArchiveD, '/gpdir')).sort(), ['bar.data', 'foo.txt'])

  // export all and overwrite target
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveE
  })

  t.deepEqual((await pda.readdir(dstArchiveE, '/')).sort(), ['bar.data', 'foo.txt', 'otherfile.txt', 'subdir'])
  t.deepEqual((await pda.readdir(dstArchiveE, '/subdir')).sort(), ['bar.data', 'foo.txt'])

  // into bad subdir
  // =

  await t.throws(pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveE,
    dstPath: '/bad/subdir'
  }))
  await t.throws(pda.exportArchiveToArchive({
    srcArchive: srcArchiveA,
    dstArchive: dstArchiveE,
    dstPath: '/foo.txt'
  }))
})

test('exportArchiveToArchive w/staging', async t => {
  const srcArchiveA = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'subdir/',
    'subdir/foo.txt',
    { name: 'subdir/bar.data', content: Buffer.from([0x00, 0x01]) }
  ], {staging: true})

  const dstArchiveA = await tutil.createArchive([], {staging: true})
  const dstArchiveB = await tutil.createArchive([], {staging: true})
  const dstArchiveC = await tutil.createArchive([], {staging: true})
  const dstArchiveD = await tutil.createArchive([], {staging: true})
  const dstArchiveE = await tutil.createArchive([
    {name: 'foo.txt', content: 'asdf'},
    'bar.data/',
    'subdir/',
    'subdir/foo.txt/',
    'subdir/bar.data/',
    'subdir/bar.data/hi',
    'otherfile.txt'
  ], {staging: true})

  await new Promise(resolve => dstArchiveA.ready(resolve))
  await new Promise(resolve => dstArchiveB.ready(resolve))
  await new Promise(resolve => dstArchiveC.ready(resolve))
  await new Promise(resolve => dstArchiveD.ready(resolve))
  await new Promise(resolve => dstArchiveE.ready(resolve))

  // export all
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA.staging,
    dstArchive: dstArchiveA.staging
  })

  t.deepEqual((await pda.readdir(dstArchiveA.staging, '/')).sort(), ['bar.data', 'foo.txt', 'subdir'])
  t.deepEqual((await pda.readdir(dstArchiveA.staging, '/subdir')).sort(), ['bar.data', 'foo.txt'])
  t.deepEqual((await pda.commit(dstArchiveA.staging)).length, 5)

  // export from subdir
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA.staging,
    dstArchive: dstArchiveB.staging,
    srcPath: '/subdir'
  })

  t.deepEqual((await pda.readdir(dstArchiveB.staging, '/')).sort(), ['bar.data', 'foo.txt'])
  t.deepEqual((await pda.commit(dstArchiveB.staging)).length, 2)

  // export to subdir
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA.staging,
    dstArchive: dstArchiveC.staging,
    dstPath: '/gpdir'
  })

  t.deepEqual((await pda.readdir(dstArchiveC.staging, '/')).sort(), ['gpdir'])
  t.deepEqual((await pda.readdir(dstArchiveC.staging, '/gpdir')).sort(), ['bar.data', 'foo.txt', 'subdir'])
  t.deepEqual((await pda.readdir(dstArchiveC.staging, '/gpdir/subdir')).sort(), ['bar.data', 'foo.txt'])
  t.deepEqual((await pda.commit(dstArchiveC.staging)).length, 6)

  // export from subdir to subdir
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA.staging,
    dstArchive: dstArchiveD.staging,
    srcPath: '/subdir',
    dstPath: '/gpdir'
  })

  t.deepEqual((await pda.readdir(dstArchiveD.staging, '/')).sort(), ['gpdir'])
  t.deepEqual((await pda.readdir(dstArchiveD.staging, '/gpdir')).sort(), ['bar.data', 'foo.txt'])
  t.deepEqual((await pda.commit(dstArchiveD.staging)).length, 3)

  // export all and overwrite target
  // =

  await pda.exportArchiveToArchive({
    srcArchive: srcArchiveA.staging,
    dstArchive: dstArchiveE.staging
  })

  t.deepEqual((await pda.readdir(dstArchiveE.staging, '/')).sort(), ['bar.data', 'foo.txt', 'otherfile.txt', 'subdir'])
  t.deepEqual((await pda.readdir(dstArchiveE.staging, '/subdir')).sort(), ['bar.data', 'foo.txt'])
  t.deepEqual((await pda.commit(dstArchiveE.staging)).length, 8)

  // into bad subdir
  // =

  await t.throws(pda.exportArchiveToArchive({
    srcArchive: srcArchiveA.staging,
    dstArchive: dstArchiveE.staging,
    dstPath: '/bad/subdir'
  }))
  await t.throws(pda.exportArchiveToArchive({
    srcArchive: srcArchiveA.staging,
    dstArchive: dstArchiveE.staging,
    dstPath: '/foo.txt'
  }))
})
