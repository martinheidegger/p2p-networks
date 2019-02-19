'use strict'
module.exports = function toArray (iter, byoa) {
  if (iter[Symbol.iterator] !== undefined) {
    iter = iter[Symbol.iterator]()
  }
  const first = iter.next()
  if (first.done) {
    return undefined
  }
  if (byoa === undefined) {
    byoa = [first.value]
  } else {
    byoa[0] = first.value
  }
  let count = 1
  while (true) {
    const current = iter.next()
    if (current.done === true) {
      return byoa
    }
    byoa[count++] = current.value
  }
}
