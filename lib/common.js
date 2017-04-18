const {NotFoundError, DestDirectoryNotEmpty} = require('beaker-error-constants')

function toBeakerError (err, info) {
  if (err.notFound) {
    return new NotFoundError()
  } else if (err.toString().indexOf('Directory is not empty') !== -1) {
    return new DestDirectoryNotEmpty()
  } else {
    // TODO cover all error types
    console.error(`Pauls-Dat-API: Unhandled error type from ${info}`, err)
    return new Error('Unexpected error')
  }
}

// helper to convert a dat-node object to a hyperdrive archive
function normalizeArchive (archive) {
  return (archive.archive) ? archive.archive : archive
}

// helper to convert an encoding to something acceptable
function toValidEncoding (str) {
  if (!str) return 'utf8'
  if (!['utf8', 'utf-8', 'hex', 'base64', 'binary'].includes(str)) return 'binary'
  return str
}

module.exports = {
  toBeakerError,
  normalizeArchive,
  toValidEncoding
}