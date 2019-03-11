'use strict'
const filter = require('../../../lib/iter/filter.js')
const toArray = require('../../../lib/iter/toArray.js')
const tape = require('tape-x')()

tape('basic tests', t => {
  t.deepEquals(toArray(filter(null, [])), undefined, 'empty')
  t.deepEquals(toArray(filter(x => true, [1])), [1], 'one entry')
  t.deepEquals(toArray(filter(x => false, [1])), undefined, 'no entry filtered')
  t.deepEquals(toArray(filter(x => x === 2, [1, 2])), [2], 'one entry filtered')
  t.end()
})
