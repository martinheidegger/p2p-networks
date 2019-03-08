'use strict'
module.exports = function * combine (a, b) {
  if (a) {
    for (const val of a) {
      yield val
    }
  }
  if (b) {
    for (const val of b) {
      yield val
    }
  }
}
