const {NotFoundError, DestDirectoryNotEmpty} = require('beaker-error-constants')

function toBeakerError (err, info) {
  if (err.notFound || err.code === 'ENOENT' || err.code === 'ENOTDIR') {
    return new NotFoundError()
  } else if (err.toString().indexOf('Directory is not empty') !== -1) {
    return new DestDirectoryNotEmpty()
  } else {
    // TODO cover all error types
    console.error(`Pauls-Dat-API: Unhandled error type from ${info}`, err)
    return new Error('Unexpected error')
  }
}

// helper to convert an encoding to something acceptable
function toValidEncoding (str) {
  if (!str) return 'utf8'
  if (!['utf8', 'utf-8', 'hex', 'base64'].includes(str)) return undefined
  return str
}

module.exports = {
  toBeakerError,
  toValidEncoding
}
