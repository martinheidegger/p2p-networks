'use strict'
const { DONE } = require('./_common')
module.exports = function * map (iter, operation) {
  if (iter[Symbol.iterator] !== undefined) {
    iter = iter[Symbol.iterator]()
  }
  while (true) {
    const current = iter.next()
    if (current.done === true) {
      return
    }
    yield operation(current.value)
  }
}
