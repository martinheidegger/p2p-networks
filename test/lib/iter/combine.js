'use strict'
const combine = require('../../../lib/iter/combine.js')
const toArray = require('../../../lib/iter/toArray.js')
const tape = require('tape-x')()

tape('combining a few entries', t => {
  t.deepEquals(toArray(combine([])), undefined, 'empty')
  t.deepEquals(toArray(combine([[]])), undefined, 'empty item')
  t.deepEquals(toArray(combine([[1], [2]])), [1, 2], 'two arrays')
  t.deepEquals(toArray(combine([[1], [], [2]])), [1, 2], 'empty item inbetween two arrays')
  t.deepEquals(toArray(combine([[], [1, 2], [3, 4]])), [1, 2, 3, 4], 'items with more than one entry')
  t.deepEquals(toArray(combine([[1][Symbol.iterator]()])), [1], 'With a simple iterator')
  t.end()
})
