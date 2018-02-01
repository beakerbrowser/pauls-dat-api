# pauls-dat-api

A library of functions that make working with [dat](https://github.com/datproject/dat-node) / [hyperdrive](https://github.com/mafintosh/hyperdrive) easier.
Includes common operations, and some sugars.
These functions were factored out of [beaker browser](https://github.com/beakerbrowser/beaker)'s internal APIs.

All async methods work with callbacks and promises. If no callback is provided, a promise will be returned.

Any time a hyperdrive `archive` is expected, a [hyperdrive-staging-area](https://github.com/pfrazee/hyperdrive-staging-area) instance can be provided, unless otherwise stated.

```js
var hyperdrive = require('hyperdrive')
var hyperstaging = require('hyperdrive-staging-area')

var archive = hyperdrive('./my-first-hyperdrive-meta') // metadata will be stored in this folder
var staging = hyperstaging(archive, './my-first-hyperdrive') // content will be stored in this folder

await pda.readFile(archive, '/hello.txt') // read the committed hello.txt
await pda.readFile(staging, '/hello.txt') // read the local hello.txt
```

** NOTE: this library is written natively for node 7 and above. **

To use with node versions lesser than 7 use:
```js
var pda = require('pauls-dat-api/es5');
```

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Staging](#staging)
  - [diff(staging[, opts, cb])](#diffstaging-opts-cb)
  - [commit(staging[, opts, cb])](#commitstaging-opts-cb)
  - [revert(staging[, opts, cb])](#revertstaging-opts-cb)
- [Lookup](#lookup)
  - [stat(archive, name[, cb])](#statarchive-name-cb)
- [Read](#read)
  - [readFile(archive, name[, opts, cb])](#readfilearchive-name-opts-cb)
  - [readdir(archive, path[, opts, cb])](#readdirarchive-path-opts-cb)
  - [createReaddirStream(archive[, path, opts])](#createreaddirstreamarchive-path-opts)
  - [readSize(archive, path[, cb])](#readsizearchive-path-cb)
- [Write](#write)
  - [writeFile(archive, name, data[, opts, cb])](#writefilearchive-name-data-opts-cb)
  - [mkdir(archive, name[, cb])](#mkdirarchive-name-cb)
  - [copy(archive, sourceName, targetName[, cb])](#copyarchive-sourcename-targetname-cb)
  - [rename(archive, sourceName, targetName[, cb])](#renamearchive-sourcename-targetname-cb)
- [Delete](#delete)
  - [unlink(archive, name[, cb])](#unlinkarchive-name-cb)
  - [rmdir(archive, name[, opts, cb])](#rmdirarchive-name-opts-cb)
- [Network](#network)
  - [download(archive, name[, cb])](#downloadarchive-name-cb)
- [Activity Streams](#activity-streams)
  - [createFileActivityStream(archive[, staging, path])](#createfileactivitystreamarchive-staging-path)
  - [createNetworkActivityStream(archive)](#createnetworkactivitystreamarchive)
- [Exporters](#exporters)
  - [exportFilesystemToArchive(opts[, cb])](#exportfilesystemtoarchiveopts-cb)
  - [exportArchiveToFilesystem(opts[, cb])](#exportarchivetofilesystemopts-cb)
  - [exportArchiveToArchive(opts[, cb])](#exportarchivetoarchiveopts-cb)
- [Manifest](#manifest)
  - [readManifest(archive[, cb])](#readmanifestarchive-cb)
  - [writeManifest(archive, manifest[, cb])](#writemanifestarchive-manifest-cb)
  - [updateManifest(archive, manifest[, cb])](#updatemanifestarchive-manifest-cb)
  - [generateManifest(opts)](#generatemanifestopts)
- [Helpers](#helpers)
  - [findEntryByContentBlock(archive, block)](#findentrybycontentblockarchive-block)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

```js
const pda = require('pauls-dat-api')
```

## Staging

### diff(staging[, opts, cb])

List the differences between `staging` and its `archive`.

 - `archive` Hyperdrive archive (object).
 - `staging` HyperdriveStagingArea instance (object).
 - `opts.skipIgnore` Don't use staging's .datignore (bool).
 - Returns an array of changes.

```js
await pda.diff(staging)
```

Output looks like:

```js
[
  {
    change: 'add' | 'mod' | 'del'
    type: 'dir' | 'file'
    path: String (path of the file)
  },
  ...
]
```

### commit(staging[, opts, cb])

Apply the changes in `staging` to its `archive`.

 - `staging` HyperdriveStagingArea instance (object).
 - `opts.skipIgnore` Don't use staging's .datignore (bool).
 - Returns an array of the changes applied.

```js
await pda.commit(staging)
```

Output looks like:

```js
[
  {
    change: 'add' | 'mod' | 'del'
    type: 'dir' | 'file'
    path: String (path of the file)
  },
  ...
]
```

### revert(staging[, opts, cb])

Revert the changes in `staging` to reflect the state of its `archive`.

 - `staging` HyperdriveStagingArea instance (object).
 - `opts.skipIgnore` Don't use staging's .datignore (bool).
 - Returns an array of the changes that were reverted.

```js
await pda.revert(staging)
```

Output looks like:

```js
[
  {
    change: 'add' | 'mod' | 'del'
    type: 'dir' | 'file'
    path: String (path of the file)
  },
  ...
]
```

## Lookup

### stat(archive, name[, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Entry name (string).
 - Returns a Hyperdrive Stat entry (object).
 - Throws NotFoundError

```js
// by name:
var st = await pda.stat(archive, '/dat.json')
st.isDirectory()
st.isFile()
console.log(st) /* =>
Stat {
  dev: 0,
  nlink: 1,
  rdev: 0,
  blksize: 0,
  ino: 0,
  mode: 16877,
  uid: 0,
  gid: 0,
  size: 0,
  offset: 0,
  blocks: 0,
  atime: 2017-04-10T18:59:00.147Z,
  mtime: 2017-04-10T18:59:00.147Z,
  ctime: 2017-04-10T18:59:00.147Z,
  linkname: undefined } */
```

## Read

### readFile(archive, name[, opts, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Entry path (string).
 - `opts`. Options (object|string). If a string, will act as `opts.encoding`.
 - `opts.encoding` Desired output encoding (string). May be 'binary', 'utf8', 'hex', or 'base64'. Default 'utf8'.
 - Returns the content of the file in the requested encoding.
 - Throws NotFoundError, NotAFileError.

```js
var manifestStr = await pda.readFile(archive, '/dat.json')
var imageBase64 = await pda.readFile(archive, '/favicon.png', 'base64')
```

### readdir(archive, path[, opts, cb])

 - `archive` Hyperdrive archive (object).
 - `path` Target directory path (string).
 - `opts.recursive` Read all subfolders and their files as well?
 - Returns an array of file and folder names.

```js
var listing = await pda.readdir(archive, '/assets')
console.log(listing) // => ['profile.png', 'styles.css']

var listing = await pda.readdir(archive, '/', { recursive: true })
console.log(listing) /* => [
  'index.html',
  'assets',
  'assets/profile.png',
  'assets/styles.css'
]*/
```

### createReaddirStream(archive[, path, opts])

 - `archive` Hyperdrive archive (object).
 - `path` Target directory path (string), defaults to `/`.
 - `opts.recursive` Read all subfolders and their files as well?
 - `opts.maxDepth` Limit the depth until which to look into folders.
 - `opts.depthFirst` Using a [depth-first search](https://en.wikipedia.org/wiki/Depth-first_search) instead of the default [breadth-first search](https://en.wikipedia.org/wiki/Breadth-first_search).
 - Returns a [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable) in [`Object Mode`](https://nodejs.org/api/stream.html#stream_object_mode). The payload per entry is an object:
     - `entry.location` The path of the entry
     - `entry.stats` A [Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats) object for that path

```js
var stream = pda.createReaddirStream(archive, '/assets')
stream.on('data', ({location, stat}) => {
  console.log(location) // => 'profile.png', 'styles.css'
  console.log(stat.isDirectory()) // => false, false
})

var stream = pda.createReaddirStream(archive, { recursive: true })
stream.on('data', ({location, stat}) => {
  console.log(location) // => 'assets', 'index.html', 'assets/profile.png', 'assets/styles.css'
})

var stream = pda.createReaddirStream(archive, { recursive: true, depthFirst: true })
stream.on('data', ({location, stat}) => {
  console.log(location) // => 'assets', 'assets/profile.png', 'assets/styles.css', 'index.html'
})
```

### readSize(archive, path[, cb])

 - `archive` Hyperdrive archive (object).
 - `path` Target directory path (string).
 - Returns a number (size in bytes).

This method will recurse on folders.

```js
var size = await pda.readSize(archive, '/assets')
console.log(size) // => 123
```

## Write

### writeFile(archive, name, data[, opts, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Entry path (string).
 - `data` Data to write (string|Buffer).
 - `opts`. Options (object|string). If a string, will act as `opts.encoding`.
 - `opts.encoding` Desired file encoding (string). May be 'binary', 'utf8', 'hex', or 'base64'. Default 'utf8' if `data` is a string, 'binary' if `data` is a Buffer.
 - Throws ArchiveNotWritableError, InvalidPathError, EntryAlreadyExistsError, ParentFolderDoesntExistError, InvalidEncodingError.

```js
await pda.writeFile(archive, '/hello.txt', 'world', 'utf8')
await pda.writeFile(archive, '/profile.png', fs.readFileSync('/tmp/dog.png'))
```

### mkdir(archive, name[, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Directory path (string).
 - Throws ArchiveNotWritableError, InvalidPathError, EntryAlreadyExistsError, ParentFolderDoesntExistError, InvalidEncodingError.

```js
await pda.mkdir(archive, '/stuff')
```

### copy(archive, sourceName, targetName[, cb])

 - `archive` Hyperdrive archive (object).
 - `sourceName` Path to file or directory to copy (string).
 - `targetName` Where to copy the file or folder to (string).
 - Throws ArchiveNotWritableError, InvalidPathError, EntryAlreadyExistsError, ParentFolderDoesntExistError, InvalidEncodingError.

```js
// copy file:
await pda.copy(archive, '/foo.txt', '/foo.txt.back')
// copy folder:
await pda.copy(archive, '/stuff', '/stuff-copy')
```

### rename(archive, sourceName, targetName[, cb])

 - `archive` Hyperdrive archive (object).
 - `sourceName` Path to file or directory to rename (string).
 - `targetName` What the file or folder should be named (string).
 - Throws ArchiveNotWritableError, InvalidPathError, EntryAlreadyExistsError, ParentFolderDoesntExistError, InvalidEncodingError.

This is equivalent to moving a file/folder.

```js
// move file:
await pda.copy(archive, '/foo.txt', '/foo.md')
// move folder:
await pda.rename(archive, '/stuff', '/things')
```

## Delete

### unlink(archive, name[, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Entry path (string).
 - Throws ArchiveNotWritableError, NotFoundError, NotAFileError

```js
await pda.unlink(archive, '/hello.txt')
```

### rmdir(archive, name[, opts, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Entry path (string).
 - `opts.recursive` Delete all subfolders and files if the directory is not empty.
 - Throws ArchiveNotWritableError, NotFoundError, NotAFolderError, DestDirectoryNotEmpty

```js
await pda.rmdir(archive, '/stuff', {recursive: true})
```

## Network

### download(archive, name[, cb])

 - `archive` Hyperdrive archive (object). Can not be a staging object.
 - `name` Entry path (string). Can point to a file or folder.

Download an archive file or folder-tree.

```js
// download a specific file:
await pda.download(archive, '/foo.txt')
// download a specific folder and all children:
await pda.download(archive, '/bar/')
// download the entire archive:
await pda.download(archive, '/')
```

## Activity Streams

### createFileActivityStream(archive[, staging, path])

 - `archive` Hyperdrive archive (object).
 - `staging` HyperdriveStagingArea instance (object).
 - `path` Entry path (string) or [anymatch](npm.im/anymatch) pattern (array of strings). If falsy, will watch all files.
 - Returns a Readable stream.

Watches the given path or path-pattern for file events, which it emits as an [emit-stream](https://github.com/substack/emit-stream). Supported events:

 - `['changed',{path}]` - The contents of the file has changed, either by a local write or a remote write. The new content will be ready when this event is emitted. `path` is the path-string of the file.
 - `['invalidated',{path}]` - The contents of the file has changed remotely, but hasn't been downloaded yet. `path` is the path-string of the file.

An archive will emit "invalidated" first, when it receives the new metadata for the file. It will then emit "changed" when the content arrives. (A local archive will not emit "invalidated.")

```js
var es = pda.createFileActivityStream(archive)
var es = pda.createFileActivityStream(archive, 'foo.txt')
var es = pda.createFileActivityStream(archive, ['**/*.txt', '**/*.md'])

es.on('data', ([event, args]) => {
  if (event === 'invalidated') {
    console.log(args.path, 'has been invalidated')
    pda.download(archive, args.path)
  } else if (event === 'changed') {
    console.log(args.path, 'has changed')
  }
})

// alternatively, via emit-stream:

var emitStream = require('emit-stream')
var events = emitStream(es)
events.on('invalidated', args => {
  console.log(args.path, 'has been invalidated')
  pda.download(archive, args.path)
})
events.on('changed', args => {
  console.log(args.path, 'has changed')
})
```

### createNetworkActivityStream(archive)

 - `archive` Hyperdrive archive (object). Can not be a staging object.
 - Returns a Readable stream.

Watches the archive for network events, which it emits as an [emit-stream](https://github.com/substack/emit-stream). Supported events:

 - `['network-changed',{connections}]` - The number of connections has changed. `connections` is a number.
 - `['download',{feed,block,bytes}]` - A block has been downloaded. `feed` will either be "metadata" or "content". `block` is the index of data downloaded. `bytes` is the number of bytes in the block.
 - `['upload',{feed,block,bytes}]` - A block has been uploaded. `feed` will either be "metadata" or "content". `block` is the index of data downloaded. `bytes` is the number of bytes in the block.
 - `['sync',{feed}]` - All known blocks have been downloaded. `feed` will either be "metadata" or "content".

```js
var es = pda.createNetworkActivityStream(archive)

es.on('data', ([event, args]) => {
  if (event === 'network-changed') {
    console.log('Connected to %d peers', args.connections)
  } else if (event === 'download') {
    console.log('Just downloaded %d bytes (block %d) of the %s feed', args.bytes, args.block, args.feed)
  } else if (event === 'upload') {
    console.log('Just uploaded %d bytes (block %d) of the %s feed', args.bytes, args.block, args.feed)
  } else if (event === 'sync') {
    console.log('Finished downloading', args.feed)
  }
})

// alternatively, via emit-stream:

var emitStream = require('emit-stream')
var events = emitStream(es)
events.on('network-changed', args => {
  console.log('Connected to %d peers', args.connections)
})
events.on('download', args => {
  console.log('Just downloaded %d bytes (block %d) of the %s feed', args.bytes, args.block, args.feed)
})
events.on('upload', args => {
  console.log('Just uploaded %d bytes (block %d) of the %s feed', args.bytes, args.block, args.feed)
})
events.on('sync', args => {
  console.log('Finished downloading', args.feed)
})
```

## Exporters

### exportFilesystemToArchive(opts[, cb])

 - `opts.srcPath` Source path in the filesystem (string). Required.
 - `opts.dstArchive` Destination archive (object). Required.
 - `opts.dstPath` Destination path within the archive. Optional, defaults to '/'.
 - `opts.ignore` Files not to copy (array of strings). Optional. Uses [anymatch](npm.im/anymatch).
 - `opts.inplaceImport` Should import source directory in-place? (boolean). If true and importing a directory, this will cause the directory's content to be copied directy into the `dstPath`. If false, will cause the source-directory to become a child of the `dstPath`.
 - Returns stats on the export.

Copies a file-tree into an archive.

```js
var stats = await pda.exportFilesystemToArchive({
  srcPath: '/tmp/mystuff',
  dstArchive: archive,
  inplaceImport: true
})
console.log(stats) /* => {
  addedFiles: ['fuzz.txt', 'foo/bar.txt'],
  updatedFiles: ['something.txt'],
  skipCount: 3, // files skipped due to the target already existing
  fileCount: 3,
  totalSize: 400 // bytes
}*/
```

### exportArchiveToFilesystem(opts[, cb])

 - `opts.srcArchive` Source archive (object). Required.
 - `opts.dstPath` Destination path in the filesystem (string). Required.
 - `opts.srcPath` Source path within the archive. Optional, defaults to '/'.
 - `opts.ignore` Files not to copy (array of strings). Optional. Uses [anymatch](npm.im/anymatch).
 - `opts.overwriteExisting` Proceed if the destination isn't empty (boolean). Default false.
 - `opts.skipUndownloadedFiles` Ignore files that haven't been downloaded yet (boolean). Default false. If false, will wait for source files to download.
 - Returns stats on the export.

Copies an archive into the filesystem.

NOTE

 - Unlike exportFilesystemToArchive, this will not compare the target for equality before copying. If `overwriteExisting` is true, it will simply copy all files again.

```js
var stats = await pda.exportArchiveToFilesystem({
  srcArchive: archive,
  dstPath: '/tmp/mystuff',
  skipUndownloadedFiles: true
})
console.log(stats) /* => {
  addedFiles: ['fuzz.txt', 'foo/bar.txt'],
  updatedFiles: ['something.txt'],
  fileCount: 3,
  totalSize: 400 // bytes
}*/
```

### exportArchiveToArchive(opts[, cb])

 - `opts.srcArchive` Source archive (object). Required.
 - `opts.dstArchive` Destination archive (object). Required.
 - `opts.srcPath` Source path within the source archive (string). Optional, defaults to '/'.
 - `opts.dstPath` Destination path within the destination archive (string). Optional, defaults to '/'.
 - `opts.ignore` Files not to copy (array of strings). Optional. Uses [anymatch](npm.im/anymatch).
 - `opts.skipUndownloadedFiles` Ignore files that haven't been downloaded yet (boolean). Default false. If false, will wait for source files to download.

Copies an archive into another archive.

NOTE

 - Unlike exportFilesystemToArchive, this will not compare the target for equality before copying. It copies files indescriminately.

```js
var stats = await pda.exportArchiveToArchive({
  srcArchive: archiveA,
  dstArchive: archiveB,
  skipUndownloadedFiles: true
})
console.log(stats) /* => {
  addedFiles: ['fuzz.txt', 'foo/bar.txt'],
  updatedFiles: ['something.txt'],
  fileCount: 3,
  totalSize: 400 // bytes
}*/
```

## Manifest

### readManifest(archive[, cb])

 - `archive` Hyperdrive archive (object).

A sugar to get the manifest object.

```js
var manifestObj = await pda.readManifest(archive)
```

### writeManifest(archive, manifest[, cb])

 - `archive` Hyperdrive archive (object).
 - `manifest` Manifest values (object).

A sugar to write the manifest object.

```js
await pda.writeManifest(archive, { title: 'My dat!' })
```

### updateManifest(archive, manifest[, cb])

 - `archive` Hyperdrive archive (object).
 - `manifest` Manifest values (object).

A sugar to modify the manifest object.

```js
await pda.writeManifest(archive, { title: 'My dat!', description: 'the desc' })
await pda.writeManifest(archive, { title: 'My new title!' }) // preserves description
```

### generateManifest(opts)

 - `opts` Manifest options (object).

Helper to generate a manifest object. Opts in detail:

```
{
  url: String, the dat's url
  title: String
  description: String
  type: Array<String>
  author: String | Object{name: String, url: String}
  repository: String
  web_root: String
  fallback_page: String
}
```

See: https://github.com/datprotocol/dat.json

## Helpers

### findEntryByContentBlock(archive, block)

 - `archive` Hyperdrive archive (object).
 - `block` Content-block index
 - Returns a Promise for `{name:, start:, end:}`

Runs a binary search to find the file-entry that the given content-block index belongs to.

```js
await pda.findEntryByContentBlock(archive, 5)
/* => {
  name: '/foo.txt',
  start: 4,
  end: 6
}*/
```
