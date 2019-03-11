'use strict'
const tape = require('tape-x')()
const limit = require('../../../lib/iter/limit.js')
const toArray = require('../../../lib/iter/toArray.js')

tape('0 of 2', t => {
  t.deepEqual(toArray(limit(0, ['a', 'b'])), undefined)
  t.end()
})

tape('1 of 2', t => {
  t.deepEqual(toArray(limit(1, ['a', 'b'])), ['a'])
  t.end()
})

tape('3 of 2', t => {
  t.deepEqual(toArray(limit(3, ['a', 'b'])), ['a', 'b'])
  t.end()
})
