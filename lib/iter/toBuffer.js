'use strict'
const toArray = require('./toArray.js')
module.exports = function (iter) {
  const array = toArray(iter)
  if (array === undefined) {
    return
  }
  if (array.length === 1) {
    return array[0]
  }
  return Buffer.concat(array)
}
