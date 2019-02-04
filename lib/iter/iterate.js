'use strict'
module.exports = function iterate (iter) {
  if (iter[Symbol.iterator]) {
    iter = iter[Symbol.iterator]()
  }
  while (true) {
    const val = iter.next()
    if (val.done === true) {
      return
    }
  }
}
