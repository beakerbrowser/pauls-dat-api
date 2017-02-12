const DAT_MANIFEST_FILENAME = 'dat.json'
const DEFAULT_TIMEOUT = 5e3

class ExtendableError extends Error {
  constructor(msg) {
    super(msg)
    this.name = this.constructor.name
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else { 
      this.stack = (new Error(msg)).stack 
    }
  }
}

class NotFoundError extends ExtendableError {
  constructor(msg) {
    super(msg || 'File not found')
    this.notFound = true
  }
}

class NotAFileError extends ExtendableError {
  constructor(msg) {
    super(msg || 'Target must be a file')
    this.notAFile = true
  }
}

class InvalidEncodingError extends ExtendableError {
  constructor(msg) {
    super(msg || 'Invalid encoding')
    this.invalidEncoding = true
  }
}

class TimeoutError extends ExtendableError {
  constructor(msg) {
    super(msg || 'Timed out')
    this.timedOut = true
  }
}

module.exports = {DAT_MANIFEST_FILENAME, DEFAULT_TIMEOUT, NotFoundError, NotAFileError, InvalidEncodingError, TimeoutError}