'use strict'
const combineTwo = require('../../../lib/iter/combineTwo.js')
const toArray = require('../../../lib/iter/toArray.js')
const tape = require('tape-x')()

tape('basic tests', t => {
  t.deepEquals(toArray(combineTwo()), undefined, 'empty')
  t.deepEquals(toArray(combineTwo([])), undefined, 'empty item')
  t.deepEquals(toArray(combineTwo([1], [2])), [1, 2], 'two arrays')
  t.deepEquals(toArray(combineTwo([1, 2], [3, 4])), [1, 2, 3, 4], 'items with more than one entry')
  t.deepEquals(toArray(combineTwo([1][Symbol.iterator]())), [1], 'With a simple iterator')
  t.end()
})
