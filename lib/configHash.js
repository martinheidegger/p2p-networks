'use strict'
const objectHash = require('object-hash')

module.exports = function configHash (config) {
  return objectHash(config, {
    encoding: 'base64',
    respectType: false,
    unorderedArray: false,
    unorderedSets: true,
    unorderedObject: true,
  })
}
