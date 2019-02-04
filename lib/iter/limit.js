'use strict'
const DONE = require('./_common.js').DONE
module.exports = function * limit (iter, size) {
  if (iter[Symbol.iterator] !== undefined) {
    iter = iter[Symbol.iterator]()
  }
  let count = 0
  while (count < size) {
    const current = iter.next()
    if (current.done) {
      return
    }
    yield current.value
    count += 1
  }
}