'use strict'
const tape = require('tape')
const toBuffer = require('../../../lib/iter/toBuffer.js')

tape('iter/toBuffer > empty', t => {
  t.equals(toBuffer([]), undefined)
  t.end()
})

tape('iter/toBuffer > 1', t => {
  const buf = Buffer.from('a')
  t.equals(toBuffer([buf]), buf)
  t.end()
})

tape('iter/toBuffer > 2', t => {
  t.equals(toBuffer([Buffer.from('a'), Buffer.from('b')]).toString(), 'ab')
  t.end()
})
