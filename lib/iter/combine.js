'use strict'
module.exports = function * combine (iter) {
  if (iter[Symbol.iterator] !== undefined) {
    iter = iter[Symbol.iterator]()
  }
  while (true) {
    const current = iter.next()
    if (current.done === true) {
      return
    }
    let child = current.value
    if (child[Symbol.iterator] !== undefined) {
      child = child[Symbol.iterator]()
    }
    while (true) {
      const childCurrent = child.next()
      if (childCurrent.done === true) {
        break
      }
      yield childCurrent.value
    }
  }
}
