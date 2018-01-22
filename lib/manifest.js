const maybe = require('call-me-maybe')
const co = require('co')
const {DAT_MANIFEST_FILENAME, DAT_HASH_REGEX} = require('./const')
const {readFile} = require('./read')
const {writeFile} = require('./write')

// helper to read the manifest into an object
function readManifest (archive, cb) {
  return maybe(cb, co(function* () {
    var data = yield readFile(archive, DAT_MANIFEST_FILENAME)
    return JSON.parse(data.toString())
  }))
}

// helper to write a manifest object
function writeManifest (archive, manifest, cb) {
  manifest = generateManifest(manifest)
  return writeFile(archive, DAT_MANIFEST_FILENAME, JSON.stringify(manifest, null, 2), cb)
}

// helper to write updates to a manifest object
function updateManifest (archive, updates, cb) {
  return maybe(cb, co(function* () {
    var manifest = yield readManifest(archive)
    Object.assign(manifest, generateManifest(updates))
    return writeManifest(archive, manifest)
  }))
}

// helper to generate a new dat.json object
function generateManifest ({ url, title, description, type, author, web_root, fallback_page } = {}) {
  var manifest = {}
  if (isString(url)) manifest.url = url
  if (isString(title)) manifest.title = title
  if (isString(description)) manifest.description = description
  if (isString(type)) manifest.type = type.split(' ')
  if (isArrayOfStrings(type)) manifest.type = type
  if (isString(web_root)) manifest.web_root = web_root
  if (isString(fallback_page)) manifest.fallback_page = fallback_page
  if (isString(author)) {
    if (author.startsWith('dat://') || DAT_HASH_REGEX.test(author)) {
      author = {url: author}
    } else {
      author = {name: author}
    }
  }
  if (isObject(author)) {
    manifest.author = {}
    if (isString(author.name)) manifest.author.name = author.name
    if (isString(author.url) && (author.url.startsWith('dat://') || DAT_HASH_REGEX.test(author.url))) {
      manifest.author.url = author.url
    }
  }
  return manifest
}

function isString (v) {
  return typeof v === 'string'
}

function isArrayOfStrings (v) {
  return Array.isArray(v) && v.every(isString)
}

function isObject (v) {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

module.exports = {readManifest, generateManifest, writeManifest, updateManifest}
