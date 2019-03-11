'use strict'
const tape = require('tape-x')()
const toBuffer = require('../../../lib/iter/toBuffer.js')

tape('empty', t => {
  t.equals(toBuffer([]), undefined)
  t.end()
})

tape('1', t => {
  const buf = Buffer.from('a')
  t.equals(toBuffer([buf]), buf)
  t.end()
})

tape('2', t => {
  t.equals(toBuffer([Buffer.from('a'), Buffer.from('b')]).toString(), 'ab')
  t.end()
})
