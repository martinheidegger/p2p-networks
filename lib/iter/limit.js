'use strict'
module.exports = function * limit (size, iter) {
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