'use strict'
module.exports = function * map (operation, collection) {
  for (const value of collection) {
    yield operation(value)
  }
}
