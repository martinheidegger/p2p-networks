'use strict'
const DONE = require('./_common.js').DONE

module.exports = function limit (iter, size) {
  if (iter[Symbol.iterator]) {
    iter = iter[Symbol.iterator]()
  }
  let count = 0
  return {
    next: function () {
      if (count === size) {
        return DONE
      }
      count += 1
      return iter.next()
    }
  }
}