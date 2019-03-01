'use strict'
module.exports = function * combine (iter) {
  for (const item of iter) {
    for (const value of item) {
      yield value
    }
  }
}
