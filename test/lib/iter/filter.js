'use strict'
const filter = require('../../../lib/iter/filter.js')
const toArray = require('../../../lib/iter/toArray.js')
const tape = require('tape')

tape('filter', t => {
  t.deepEquals(toArray(filter([])), undefined, 'empty')
  t.deepEquals(toArray(filter([1], x => true)), [1], 'one entry')
  t.deepEquals(toArray(filter([1], x => false)), undefined, 'no entry filtered')
  t.deepEquals(toArray(filter([1, 2], x => x === 2)), [2], 'one entry filtered')
  t.end()
})
