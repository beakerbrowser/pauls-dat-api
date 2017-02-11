
// helper to get the name from a listing entry, in a standard form
function normalizeEntryName (entry) {
  var name = ('' + (entry.name || ''))
  return (name.startsWith('/')) ? name : ('/' + name)
}

// helper to convert an encoding to something acceptable
function toValidEncoding (str) {
  if (!str) return 'utf8'
  if (!['utf8', 'utf-8', 'hex', 'base64', 'binary'].includes(str)) return 'binary'
  return str
}

// `pathParts` and `childParts` should be arrays (`str.split('/')`)
function isPathChild (pathParts, childParts) {
  // all path parts should be contained in the child parts
  for (var i = 0; i < pathParts.length; i++) {
    if (pathParts[i] !== childParts[i]) return false
  }
  return true
}

module.exports = {
  normalizeEntryName,
  toValidEncoding,
  isPathChild
}