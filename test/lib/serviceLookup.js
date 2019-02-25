'use strict'
const tape = require('tape')
const serviceLookup = require('../../lib/serviceLookup.js')

tape('error: empty config', t => {
  try {
    serviceLookup({}, null)
    t.fail('No Error thrown')
  } catch (err) {
    t.equals(err.code, 'ENOSERVICE')
  }
  t.end()
})

tape('error: multiple config', t => {
  try {
    serviceLookup({}, { a: {}, b: {} })
    t.fail('No Error thrown')
  } catch (err) {
    t.equals(err.code, 'EMULTISERVICE')
    t.deepEquals(err.keys, ['a', 'b'])
  }
  t.end()
})

tape('error: unknown config', t => {
  try {
    serviceLookup({}, { a: {} })
    t.fail('No Error thrown')
  } catch (err) {
    t.equals(err.code, 'EUNKOWNSERVICE')
    t.equals(err.type, 'a')
  }
  t.end()
})

tape('error: validation error', t => {
  const err = new Error()
  try {
    serviceLookup({
      a: {
        validate () {
          throw err
        }
      }
    }, {
      a: {}
    })
    t.fail('No error thrown')
  } catch (thrownErr) {
    t.equal(thrownErr, err)
  }
  t.end()
})

tape('normal operation', t => {
  const conf = {}
  let called = 0
  const factory = serviceLookup({
    a: {
      validate: () => {},
      create (receivedConfig) {
        called += 1
        t.equals(conf, receivedConfig)
      }
    }
  }, { a: conf })
  t.equals(called, 0)
  factory.create()
  t.equals(called, 1)
  t.end()
})

tape('lazy loading', t => {
  const conf = {}
  let called = 0
  const factory = serviceLookup({
    a: () => ({
      validate: () => {},
      create (receivedConfig) {
        called += 1
        t.equals(conf, receivedConfig)
      }
    })
  }, { a: conf })
  t.equals(called, 0)
  factory.create()
  t.equals(called, 1)
  t.end()
})
