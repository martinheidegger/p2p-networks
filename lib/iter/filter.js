'use strict'
module.exports = function* filter (check, collection) {
  for (const value of collection) {
    if (check(value)) {
      yield value
    }
  }
}
