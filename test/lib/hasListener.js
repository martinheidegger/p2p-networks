'use strict'
const tape = require('tape-x')()
const { EventEmitter } = require('events')
const hasListener = require('../../lib/hasListener.js')

tape('simple listener support', t => {
  const emitter = new EventEmitter()
  let active = null
  const stop = hasListener(emitter, 'test', isActive => active = isActive)
  t.equals(active, false)
  emitter.addListener('other', () => {})
  t.equals(active, false)
  emitter.addListener('test', () => {})
  t.equals(active, true)
  emitter.removeAllListeners('test')
  t.equals(active, false)
  emitter.addListener('test', () => {})
  t.equals(active, true)
  stop()
  emitter.removeAllListeners()
  t.equals(active, true)
  t.end()
})