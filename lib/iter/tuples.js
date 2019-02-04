'use strict'
module.exports = function * tuples (iter, aCheck, bCheck, each) {
  if (iter[Symbol.iterator]) {
    iter = iter[Symbol.iterator]()
  }
  let aFound
  let a
  let current
  while (true) {
    current = iter.next()
    if (current.done) {
      return
    }
    if (aFound) {
      if (bCheck(current.value, a)) {
        aFound = false
        yield each(a, current.value)
      }
    } else if (aCheck(current.value)) {
      aFound = true
      a = current.value
    }
  }
}