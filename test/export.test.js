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

  // initial import (dry run)
  // =

  const statsADry = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    inplaceImport: true,
    dryRun: true
  })
  var expectedAddedADry = ['/foo.txt', '/bar.data', '/subdir/foo.txt', '/subdir/bar.data']
  statsADry.addedFiles.sort(); expectedAddedADry.sort()
  t.deepEqual(statsADry.addedFiles.map(tutil.tonix), expectedAddedADry)
  t.deepEqual(statsADry.updatedFiles, [])
  t.deepEqual(statsADry.removedFiles, [])
  t.deepEqual(statsADry.addedFolders.map(tutil.tonix), ['/subdir'])
  t.deepEqual(statsADry.removedFolders, [])
  t.deepEqual(statsADry.skipCount, 0)
  t.deepEqual(statsADry.fileCount, 4)
  t.deepEqual(await pda.readdir(dstArchive, '/'), [])

  // initial import
  // =

  const statsA = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    inplaceImport: true
  })
  var expectedAddedA = ['/foo.txt', '/bar.data', '/subdir/foo.txt', '/subdir/bar.data']
  statsA.addedFiles.sort(); expectedAddedA.sort()
  t.deepEqual(statsA.addedFiles.map(tutil.tonix), expectedAddedA)
  t.deepEqual(statsADry.updatedFiles, [])
  t.deepEqual(statsADry.removedFiles, [])
  t.deepEqual(statsADry.addedFolders.map(tutil.tonix), ['/subdir'])
  t.deepEqual(statsADry.removedFolders, [])
  t.deepEqual(statsA.skipCount, 0)
  t.deepEqual(statsA.fileCount, 4)

  // no changes
  // =

  const statsB = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    inplaceImport: true
  })
  var expectedUpdatedB = ['/bar.data', '/foo.txt', '/subdir/bar.data', '/subdir/foo.txt']
  t.deepEqual(statsB.addedFiles, [])
  t.deepEqual(statsB.updatedFiles.map(tutil.tonix), expectedUpdatedB)
  t.deepEqual(statsB.skipCount, 0)
  t.deepEqual(statsB.fileCount, 4)

  // make changes
  // =

  fs.writeFileSync(path.join(srcPath, 'foo.txt'), 'new content')
  fs.writeFileSync(path.join(srcPath, 'subdir', 'bar.data'), Buffer.from([0x01, 0x02, 0x03, 0x04]))
  fs.mkdirSync(path.join(srcPath, 'subdir2'))
  fs.writeFileSync(path.join(srcPath, 'subdir2', 'foo.txt'), 'content')

  // 2 changes, 2 additions (dry run)
  // =

  const statsDDry = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    inplaceImport: true,
    dryRun: true
  })
  var expectedAddedDDry = ['/subdir2/foo.txt']
  statsDDry.addedFiles.sort(); expectedAddedDDry.sort()
  t.deepEqual(statsDDry.addedFiles.map(tutil.tonix), expectedAddedDDry)
  var expectedUpdatedD = ['/bar.data', '/foo.txt', '/subdir/bar.data', '/subdir/foo.txt']
  statsDDry.updatedFiles.sort(); expectedUpdatedD.sort()
  t.deepEqual(statsDDry.updatedFiles.map(tutil.tonix), expectedUpdatedD)
  t.deepEqual(statsDDry.addedFolders.map(tutil.tonix), ['/subdir2'])
  t.deepEqual(statsDDry.skipCount, 0)
  t.deepEqual(statsDDry.fileCount, 5)
  t.deepEqual((await pda.readdir(dstArchive, '/')).length, 3)

  // 2 changes, 2 additions
  // =

  const statsD = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    inplaceImport: true
  })
  var expectedAddedD = ['/subdir2/foo.txt']
  statsD.addedFiles.sort(); expectedAddedD.sort()
  t.deepEqual(statsD.addedFiles.map(tutil.tonix), expectedAddedD)
  var expectedUpdatedD = ['/bar.data', '/foo.txt', '/subdir/bar.data', '/subdir/foo.txt']
  statsD.updatedFiles.sort(); expectedUpdatedD.sort()
  t.deepEqual(statsD.updatedFiles.map(tutil.tonix), expectedUpdatedD)
  t.deepEqual(statsD.addedFolders.map(tutil.tonix), ['/subdir2'])
  t.deepEqual(statsD.skipCount, 0)
  t.deepEqual(statsD.fileCount, 5)

  // into subdir
  // =

  const statsE = await pda.exportFilesystemToArchive({
    srcPath,
    dstArchive,
    dstPath: '/subdir3',
    inplaceImport: true
  })
  var expectedAddedE = ['/subdir3/foo.txt', '/subdir3/bar.data', '/subdir3/subdir/foo.txt', '/subdir3/subdir/bar.data', '/subdir3/subdir2/foo.txt']
  statsE.addedFiles = statsE.addedFiles.map(tutil.tonix)
  statsE.addedFiles.sort(); expectedAddedE.sort()
  t.deepEqual(statsE.addedFiles, expectedAddedE)
  t.deepEqual(statsE.updatedFiles, [])
  t.deepEqual(statsE.skipCount, 0)
  t.deepEqual(statsE.fileCount, 5)

  // dont overwrite folders with files
  // =

  await pda.mkdir(dstArchive, '/subdir4')
  const statsF = await pda.exportFilesystemToArchive({
    srcPath: path.join(srcPath, 'foo.txt'),
    dstArchive,
    dstPath: '/subdir4',
    inplaceImport: true
  })
  t.deepEqual(statsF.addedFiles.map(tutil.tonix), ['/subdir4/foo.txt'])
  t.deepEqual(statsF.updatedFiles, [])
  t.deepEqual(statsF.skipCount, 0)
  t.deepEqual(statsF.fileCount, 1)  
  t.deepEqual(await pda.readdir(dstArchive, '/subdir4'), ['foo.txt'])

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

