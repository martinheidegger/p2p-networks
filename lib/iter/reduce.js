'use strict'
module.exports = function reduce (operation, collection, result) {
  let first = result === undefined
  for (const value of collection) {
    if (first === true) {
      result = value
      first = false
    } else {
      result = operation(result, value)
    }
  }
  return result
}