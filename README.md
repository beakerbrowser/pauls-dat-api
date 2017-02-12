# pauls-dat-api

A library of functions that make working with [dat](https://github.com/datproject/dat-node) / [hyperdrive](https://github.com/mafintosh/hyperdrive) easier.
Includes common operations, and some sugars.
These functions were factored out of [beaker browser](https://github.com/beakerbrowser/beaker)'s internal APIs.

All async methods work with callbacks and promises. If no callback is provided, a promise will be returned.

Any time a hyperdrive `archive` is expected, a [dat-node](https://github.com/datproject/dat-node) instance can be used.

## API

```js
const pda = require('pauls-dat-api')
```

### normalizeEntryName(entry)

 - `entry` Hyperdrive entry (object).
 - Returns a normalized name (string).

Dat is agnostic about whether entry names have a preceding slash. This method enforces a preceding slash.

```js
pda.normalizeEntryName({ name: 'foo/bar' })
// => '/foo/bar'
```

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

### readManifest(archive[, cb])

 - `archive` Hyperdrive archive (object).

A sugar to get the manifest object.

```js
var manifestObj = await pda.readManifest(archive)
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