'use strict'
const tape = require('tape')
const ConfigSet = require('../ConfigSet.js')

tape ('simple adding config', t => {
  t.plan(2)
  const set = new ConfigSet((cfg, cb) => {
    t.equals(cfg, 'hello')
    cb(null, {})
  })
  set.update(['hello'], err => {
    t.equals(err, null)
    t.end()
  })
})

tape ('multiple same config entries get ignored', t => {
  t.plan(2)
  const set = new ConfigSet((cfg, cb) => {
    t.equals(cfg, 'hello')
    cb(null, {})
  })
  set.update(['hello', 'hello'], err => {
    t.equals(err, null)
    t.end()
  })
})

tape ('Removing a config entry', async t => {
  t.plan(2)
  const set = new ConfigSet((cfg, cb) => {
    t.equals(cfg, 'hello')
    cb(null, {
      close (cb) {
        t.ok('close called')
        cb()
      }
    })
  })
  await set.update(['hello'])
  await set.update([])
  t.end()
})

tape ('Clearing a config', async t => {
  t.plan(2)
  const set = new ConfigSet((cfg, cb) => {
    t.equals(cfg, 'hello')
    cb(null, {
      close (cb) {
        t.ok('close called')
        cb()
      }
    })
  })
  await set.update(['hello'])
  await set.clear()
  t.end()
})

tape('Clearing a config', async t => {
  t.plan(2)
  const set = new ConfigSet((cfg, cb) => {
    t.equals(cfg, 'hello')
    cb(null, {
      close (cb) {
        t.ok('close called')
        cb()
      }
    })
  })
  await set.update(['hello'])
  await set.clear()
  t.end()
})

tape('Closing a config', async t => {
  t.plan(4)
  const set = new ConfigSet((_, cb) => {
    cb(null, {
      close: cb => cb()
    })
  })
  t.equals(await set.add('hello'), true)
  t.equals(await set.add('hello'), false)
  await set.clear()
  t.equals(await set.add('hello'), true)
  await set.close()
  t.equals(await set.add('hello'), false)
  t.end()
})
