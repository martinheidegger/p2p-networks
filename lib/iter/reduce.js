'use strict'
module.exports = function reduce (iter, operation, result) {
  if (iter[Symbol.iterator]) {
    iter = iter[Symbol.iterator]()
  }
  if (result === undefined) {
    const first = iter.next()
    if (first.done) {
      return undefined
    }
    result = first.value
  }
  while (true) {
    const current = iter.next()
    if (current.done) {
      break
    }
    result = operation(result, current.value)
  }
  return result
}