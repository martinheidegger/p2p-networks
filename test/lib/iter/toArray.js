'use strict'
const tape = require('tape')
const toArray = require('../../../lib/iter/toArray.js')

tape('iter/toArray > empty', t => {
  t.equals(toArray([]), undefined)
  t.end()
})

tape('iter/toArray > one', t => {
  t.deepEquals(toArray([1]), [1])
  t.end()
})

tape('iter/toArray > many', t => {
  t.deepEquals(toArray([1, 2, 3]), [1, 2, 3])
  t.end()
})

tape('iter/toArray > byoa', t => {
  const arr = []
  t.equals(toArray([1, 2, 3], arr), arr)
  t.deepEquals(arr, [1, 2, 3])
  t.end()
})
