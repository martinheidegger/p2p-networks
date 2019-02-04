'use strict'
module.exports = function (iter, buffer) {
  if (iter[Symbol.iterator]) {
    iter = iter[Symbol.iterator]()
  }
  let offset = 0
  while (true) {
    const current = iter.next()
    if (current.done === true) {
      break
    }
    current.value.copy(buffer, offset)
    offset += current.value.length
  }
  return buffer
}
