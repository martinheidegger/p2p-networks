'use strict'
const reduce = require('../../../lib/iter/reduce.js')
const tape = require('tape')

tape('reduce', t => {
  t.deepEquals(reduce([]), undefined, 'empty')
  t.deepEquals(reduce([1], x => x), 1, 'one item')
  t.deepEquals(reduce([1, 2], x => x), 1, 'two items')
  t.deepEquals(reduce([1], (x, y) => x + y, 2), 3, 'initial item')
  t.deepEquals(reduce([1, 2, 3], (x, y) => x + y), 6, 'multiple items')
  t.deepEquals(reduce([1][Symbol.iterator](), x => x), 1, 'iterator')
  t.end()
})
