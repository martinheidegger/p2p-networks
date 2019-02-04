'use strict'
const map = require('../../../lib/iter/map.js')
const toArray = require('../../../lib/iter/toArray.js')
const tape = require('tape')

tape('map', t => {
  t.deepEquals(toArray(map([])), undefined, 'empty')
  t.deepEquals(toArray(map([1], x => x)), [1], 'one item')
  t.deepEquals(toArray(map([2], x => x + 1 )), [3], 'one item with op')
  t.deepEquals(toArray(map([1, 2, 3][Symbol.iterator](), x => x * x)), [1, 4, 9], 'iterable with op')
  t.end()
})
