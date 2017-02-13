exports.DAT_MANIFEST_FILENAME = 'dat.json'
exports.DEFAULT_TIMEOUT = 5e3
exports.VALID_PATH_REGEX = /^[a-z0-9\-._~!$&'()*+,;=:@\/]+$/i

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

exports.NotFoundError = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'File not found')
    this.notFound = true
  }
}

exports.NotAFileError = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'Target must be a file')
    this.notAFile = true
  }
}

exports.InvalidEncodingError = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'Invalid encoding')
    this.invalidEncoding = true
  }
}

exports.TimeoutError = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'Timed out')
    this.timedOut = true
  }
}

exports.ArchiveNotWritableError = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'Cannot write to this archive ; Not the owner')
    this.archiveNotWritable = true
  }
}

exports.EntryAlreadyExistsError = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'A file or folder already exists at this path')
    this.entryAlreadyExists = true
  }
}

exports.ParentFolderDoesntExistError = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'Cannot write to this location ; No parent folder exists')
    this.parentFolderDoesntExist = true
  }
}

exports.InvalidPathError = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'The given path is not valid')
    this.invalidPath = true
  }
}

exports.SourceNotFoundError = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'Cannot read a file or folder at the given source path')
    this.sourceNotFound = true
  }
}

exports.DestDirectoryNotEmpty = class extends ExtendableError {
  constructor(msg) {
    super(msg || 'Destination path is not empty ; Aborting')
    this.destDirectoryNotEmpty = true
  }  
}