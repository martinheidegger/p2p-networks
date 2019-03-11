'use strict'
const toFixedBuffer = require('../../../lib/iter/toFixedBuffer.js')
const tape = require('tape-x')()

tape('basics', t => {
  t.equals(toFixedBuffer([Buffer.from('ab'), Buffer.from('cd')], Buffer.allocUnsafe(4)).toString(), 'abcd')
  t.equals(toFixedBuffer([], Buffer.alloc(4)).toString(), '\x00\x00\x00\x00')
  t.end()
})
