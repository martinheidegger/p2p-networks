'use strict'
module.exports = function toArray (collection, byoa) {
  for (const value of collection) {
    if (byoa === undefined) {
      byoa = [value]
    } else {
      byoa.push(value)
    }
  }
  return byoa
}
