'use strict'
const { DONE } = require('./_common')
module.exports = function map (iter, operation) {
  if (iter[Symbol.iterator]) {
    iter = iter[Symbol.iterator]()
  }
  return {
    next: function () {
      const current = iter.next()
      if (current.done) return DONE
      return {
        done: false,
        value: operation(iter.value)
      }
    }
  }
}
