'use strict'
const reduce = require('../../../lib/iter/reduce.js')
const tape = require('tape')

tape('reduce', t => {
  t.deepEquals(reduce(undefined, []), undefined, 'empty')
  t.deepEquals(reduce(x => x, [1]), 1, 'one item')
  t.deepEquals(reduce(x => x, [1, 2]), 1, 'two items')
  t.deepEquals(reduce((x, y) => x + y, [1], 2), 3, 'initial item')
  t.deepEquals(reduce((x, y) => x + y, [1, 2, 3]), 6, 'multiple items')
  t.end()
})
