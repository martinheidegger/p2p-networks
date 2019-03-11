'use strict'
const tape = require('tape-x')()
const toArray = require('../../../lib/iter/toArray.js')

tape('empty', t => {
  t.equals(toArray([]), undefined)
  t.end()
})

tape('one', t => {
  t.deepEquals(toArray([1]), [1])
  t.end()
})

tape('many', t => {
  t.deepEquals(toArray([1, 2, 3]), [1, 2, 3])
  t.end()
})

tape('byoa', t => {
  const arr = []
  t.equals(toArray([1, 2, 3], arr), arr)
  t.deepEquals(arr, [1, 2, 3])
  t.end()
})
