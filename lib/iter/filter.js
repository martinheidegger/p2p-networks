'use strict'
module.exports = function filter (iter, check) {
  if (iter[Symbol.iterator]) {
    iter = iter[Symbol.iterator]()
  }
  return {
    next () {
      let val
      do {
        val = iter.next()
      } while (!check(val.value) && val.done !== true)
      return val
    }
  }
}
