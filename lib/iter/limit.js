'use strict'
module.exports = function * limit (size, collection) {
  let count = 0
  for (const value of collection) {
    if (count >= size) {
      return
    }
    count ++
    yield value
  }
}