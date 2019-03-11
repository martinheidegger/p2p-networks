'use strict'
const tape = require('tape-x')()
const { EventEmitter } = require('events')
const toggleListener = require('../../lib/toggleListener.js')

tape('simple toggling of listener support', t => {
  const emitter = new EventEmitter()
  const handler = () => {}
  toggleListener(emitter, 'test', handler, false)
  t.equals(emitter.listenerCount('test'), 0)
  toggleListener(emitter, 'test', handler, true)
  t.equals(emitter.listenerCount('test'), 1)
  toggleListener(emitter, 'test', handler, false)
  t.equals(emitter.listenerCount('test'), 0)
  t.end()
})