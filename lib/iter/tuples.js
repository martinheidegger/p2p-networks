'use strict'
function toArrayTuple (first, second) {
  return [ first, second ]
}

module.exports = function * tuples (collection, isFirst, isSecond, each) {
  if (!each) {
    each = toArrayTuple
  }
  let firstFound = false
  let first
  for (const value of collection) {
    if (firstFound === true) {
      firstFound = false
      if (isSecond(value)) {
        yield each(first, value)
      }
    } else if (isFirst(value)) {
      firstFound = true
      first = value
    }
  }
}