const maybe = require('call-me-maybe')
const {toBeakerError} = require('./common')

function diff (staging, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, new Promise((resolve, reject) => {
    staging.diff(opts, (err, changes) => {
      if (err) reject(toBeakerError(err, 'stat'))
      else resolve(changes)
    })
  }))
}

function commit (staging, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, new Promise((resolve, reject) => {
    staging.commit(opts, (err, changes) => {
      if (err) reject(toBeakerError(err, 'stat'))
      else resolve(changes)
    })
  }))
}

function revert (staging, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  return maybe(cb, new Promise((resolve, reject) => {
    staging.revert(opts, (err, changes) => {
      if (err) reject(toBeakerError(err, 'stat'))
      else resolve(changes)
    })
  }))
}

module.exports = {diff, commit, revert}
