'use strict'
const tuples = require('../../../lib/iter/tuples.js')
const toArray = require('../../../lib/iter/toArray.js')
const tape = require('tape')

tape('tuples', t => {
  t.deepEquals(toArray(tuples([], x => typeof x === 'number', y => true, (x, y) => y + x)), undefined, 'empty')
  t.deepEquals(toArray(tuples(['a'], x => typeof x === 'number', y => true, (x, y) => y + x)), undefined, 'no match')
  t.deepEquals(toArray(tuples([1], x => typeof x === 'number', y => true, (x, y) => y + x)), undefined, 'not enough match')
  t.deepEquals(toArray(tuples([1, 'a', 2, 'b'], x => typeof x === 'number', y => true, (x, y) => y + x)), ['a1', 'b2'], 'simple tuple')
  t.deepEquals(toArray(tuples([1, 'a', 'r', 2, 'b'], x => typeof x === 'number', y => true, (x, y) => y + x)), ['a1', 'b2'], 'non-matching interloper')
  t.end()
})
