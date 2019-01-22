'use strict'
module.exports = function (iter, buffer) {
  if (iter[Symbol.iterator]) {
    iter = iter[Symbol.iterator]()
  }
  let offset = 0
  return {
    next: function () {
      const val = iter.next()
      if (val.done === true) {
        return val
      }
      buffer.copy(val.value, offset)
      offset += val.value.length
    }
  }
}
