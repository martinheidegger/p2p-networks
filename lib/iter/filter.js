'use strict'
module.exports = function filter (check, iter) {
  if (iter[Symbol.iterator] !== undefined) {
    iter = iter[Symbol.iterator]()
  }
  return {
    next () {
      let val
      do {
        val = iter.next()
      } while (val.done !== true && !check(val.value))
      return val
    }
  }
}
