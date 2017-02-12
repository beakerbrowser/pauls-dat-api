const maybe = require('call-me-maybe')
const co = require('co')
const {normalizeArchive} = require('./common')
const {DAT_MANIFEST_FILENAME} = require('./const')
const {readFile} = require('./read')
const {writeFile} = require('./write')

// helper to read the manifest into an object
function readManifest (archive, cb) {
  archive = normalizeArchive(archive)
  return maybe(cb, co(function* () {
    var data = yield readFile(archive, DAT_MANIFEST_FILENAME)
    return JSON.parse(data.toString())
  }))
}

// helper to write a manifest object
function writeManifest (archive, manifest, cb) {
  archive = normalizeArchive(archive)
  manifest = generateManifest(manifest)
  return writeFile(archive, DAT_MANIFEST_FILENAME, JSON.stringify(manifest))
}

// helper to write updates to a manifest object
function updateManifest (archive, updates, cb) {
  archive = normalizeArchive(archive)
  return maybe(cb, co(function* () {
    var manifest = yield readManifest(archive)
    Object.assign(manifest, updates)
    return writeManifest(archive, manifest)
  }))
}

// helper to generate a new dat.json object
function generateManifest ({ url, title, description, author, version, forkOf, createdBy } = {}) {
  var manifest = { url }
  if (isString(title)) manifest.title = title
  if (isString(description)) manifest.description = description
  if (isString(author)) manifest.author = author
  if (isString(version)) manifest.version = version
  if (isString(forkOf)) manifest.forkOf = [forkOf]
  if (isArrayOfStrings(forkOf)) manifest.forkOf = forkOf
  if (isString(createdBy)) manifest.createdBy = { url: manifest.createdBy }
  if (isCreatedByObj(createdBy)) manifest.createdBy = createdBy
  return manifest
}

function isString (v) {
  return typeof v === 'string'
}

function isArrayOfStrings (v) {
  return Array.isArray(v) && v.every(isString)
}

function isCreatedByObj (v) {
  return !!v && isString(v.url) && (!v.title || isString(v.title))
}

module.exports = {readManifest, generateManifest, writeManifest, updateManifest}