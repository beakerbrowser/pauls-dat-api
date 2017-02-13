# pauls-dat-api

A library of functions that make working with [dat](https://github.com/datproject/dat-node) / [hyperdrive](https://github.com/mafintosh/hyperdrive) easier.
Includes common operations, and some sugars.
These functions were factored out of [beaker browser](https://github.com/beakerbrowser/beaker)'s internal APIs.

All async methods work with callbacks and promises. If no callback is provided, a promise will be returned.

Any time a hyperdrive `archive` is expected, a [dat-node](https://github.com/datproject/dat-node) instance can be used.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Lookup](#lookup)
  - [lookupEntry(archive, name|fn[, opts, cb])](#lookupentryarchive-namefn-opts-cb)
- [Read](#read)
  - [readFile(archive, name[, opts, cb])](#readfilearchive-name-opts-cb)
  - [listFiles(archive, path[, cb])](#listfilesarchive-path-cb)
- [Write](#write)
  - [writeFile(archive, name, data[, opts, cb])](#writefilearchive-name-data-opts-cb)
  - [createDirectory(archive, name[, cb])](#createdirectoryarchive-name-cb)
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
  - [normalizeEntryName(entry)](#normalizeentrynameentry)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

```js
const pda = require('pauls-dat-api')
```

## Lookup

### lookupEntry(archive, name|fn[, opts, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Entry name (string).
 - `fn` Entry predicate (function (entry) => boolean).
 - `opts.timeout` How long until readFile gives up (number in ms). Defaults to 5000ms.
 - Returns a Hyperdrive entry (object). 
 - Does not throw. Returns null on not found.

This method will wait for archive metadata to finish downloading before responding.
The timeout will keep you from waiting indefinitely.

```js
// by name:
var entry = await pda.lookupEntry(archive, '/dat.json')

// by a predicate:
var entry = await pda.lookupEntry(archive, entry => entry.name === '/dat.json')
```

## Read

### readFile(archive, name[, opts, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Entry path (string).
 - `opts`. Options (object|string). If a string, will act as `opts.encoding`.
 - `opts.encoding` Desired output encoding (string). May be 'binary', 'utf8', 'hex', or 'base64'. Default 'utf8'.
 - `opts.timeout` How long until readFile gives up (number in ms). Defaults to 5000ms.
 - Returns the content of the file in the requested encoding.
 - Throws NotFoundError, NotAFileError, and TimeoutError.

This method will wait for archive content to finish downloading before responding.
The timeout will keep you from waiting indefinitely.

```js
var manifestStr = await pda.readFile(archive, '/dat.json')
var imageBase64 = await pda.readFile(archive, '/favicon.png', 'base64')

// wait for a day
var imageBase64 = await pda.readFile(archive, '/dat.json', {timeout: 86400000})
```

### listFiles(archive, path[, cb])

 - `archive` Hyperdrive archive (object).
 - `path` Target directory path (string).
 - Returns an map representing the entries in the directory (object).
 - Does not throw. Returns an empty object on bad path.

```js
var listing = await pda.listFiles(archive, '/assets')
console.log(listing) /* => {
  'profile.png': { type: 'file', name: '/assets/profile.png', ... },
  'styles.css': { type: 'file', name: '/assets/styles.css', ... }  
}*/
```

## Write

### writeFile(archive, name, data[, opts, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Entry path (string).
 - `data` Data to write (string|Buffer).
 - `opts`. Options (object|string). If a string, will act as `opts.encoding`.
 - `opts.encoding` Desired file encoding (string). May be 'binary', 'utf8', 'hex', or 'base64'. Default 'utf8' if `data` is a string, 'binary' if `data` is a Buffer.
 - Throws InvalidEncodingError.

```js
await pda.writeFile(archive, '/hello.txt', 'world', 'utf8')
await pda.writeFile(archive, '/profile.png', fs.readFileSync('/tmp/dog.png'))
```

### createDirectory(archive, name[, cb])

 - `archive` Hyperdrive archive (object).
 - `name` Directory path (string).

```js
await pda.createDirectory(archive, '/stuff')
```

## Exporters

### exportFilesystemToArchive(opts[, cb])

 - `opts.srcPath` Source path in the filesystem (string). Required.
 - `opts.dstArchive` Destination archive (object). Required.
 - `opts.dstPath` Destination path within the archive. Optional, defaults to '/'.
 - `opts.ignore` Files not to copy (array of strings). Optional. Uses [anymatch](npm.im/anymatch).
 - `opts.inplaceImport` Should import source directory in-place? (boolean). If true and importing a directory, this will cause the directory's content to be copied directy into the `dstPath`. If false, will cause the source-directory to become a child of the `dstPath`.
 - `opts.dryRun` Don't actually copy (boolean). If true, will run all export logic without actually modifying the target archive.
 - Returns stats on the export.

Copies a file-tree into an archive.

The `dryRun` opt is useful because this method compares the source files to the destination before copying. Therefore the stats returned by a dry run gives you a file-level diff.

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
 - This method also does not yet track stats.

```js
await pda.exportArchiveToArchive({
  srcArchive: archiveA,
  dstArchive: archiveB,
  skipUndownloadedFiles: true
})
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
  author: String
  version: String
  forkOf: String, the forked-from dat's url
  createdBy: String, the url of the app that created the dat
}
```

See: https://github.com/datprotocol/dat.json

## Helpers

### normalizeEntryName(entry)

 - `entry` Hyperdrive entry (object).
 - Returns a normalized name (string).

Dat is agnostic about whether entry names have a preceding slash. This method enforces a preceding slash.

```js
pda.normalizeEntryName({ name: 'foo/bar' })
// => '/foo/bar'
```