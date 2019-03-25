'use strict'
const tuples = require('../../../lib/iter/tuples.js')
const toArray = require('../../../lib/iter/toArray.js')
const iterate = require('../../../lib/iter/iterate.js')
const tape = require('tape-x')()

tape('basics', t => {
  t.deepEquals(toArray(tuples([], x => typeof x === 'number', y => true, (x, y) => y + x)), undefined, 'empty')
  t.deepEquals(toArray(tuples(['a'], x => typeof x === 'number', y => true, (x, y) => y + x)), undefined, 'no match')
  t.deepEquals(toArray(tuples([1], x => typeof x === 'number', y => true, (x, y) => y + x)), undefined, 'not enough match')
  t.deepEquals(toArray(tuples([1, 'a', 2, 'b'], x => typeof x === 'number', y => true, (x, y) => y + x)), ['a1', 'b2'], 'simple tuple')
  t.deepEquals(toArray(tuples([1, 'a', 'r', 2, 'b'], x => typeof x === 'number', y => true, (x, y) => y + x)), ['a1', 'b2'], 'non-matching interloper')
  t.deepEquals(toArray(tuples([1, 'a', 2, 'b'], () => true, () => true)), [[1, 'a'], [2, 'b']], 'Without each operator')
  t.end()
})

tape('second check receives first entry', t => {
  iterate(
    tuples([1, 'a'],
      x => {
        t.equals(x, 1)
        return true
      },
      (y, x) => {
        t.equals(x, 1)
        t.equals(y, 'a')
        return true
      },
      _ => t.end()
    )
  )
})
