'use strict'
module.exports = function toArray (iter) {
  if (iter[Symbol.iterator] !== undefined) {
    iter = iter[Symbol.iterator]()
  }
  const first = iter.next()
  if (first.done) {
    return undefined
  }
  const result = [first.value]
  while (true) {
    const current = iter.next()
    if (current.done === true) {
      return result
    }
    result.push(current.value)
  }
}
