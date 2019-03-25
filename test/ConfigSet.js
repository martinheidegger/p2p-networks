'use strict'
const tape = require('tape-x')()
const ConfigSet = require('../ConfigSet.js')
const configHash = require('../lib/configHash.js')

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
})

tape('Closing a config', async t => {
  t.plan(5)
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
  t.equals(await set.delete('hello'), false)
})

tape('error propagation while creating', async t => {
  const expectedError = new Error('hi')
  const set = new ConfigSet((_, cb) => {
    cb(expectedError)
  })
  set.once('add', () => {
    t.fail('add event shouldnt happen')
  })
  const p = new Promise(end => {
    set.once('warning', err => {
      t.equals(err.hash, '6fMZPgk9DaBEm9SyiXiIAODQ/dY=')
      t.equals(err.config, 'hi')
      t.equals(err.cause, expectedError)
      end()
    })
  })
  t.equals(await set.add('hi'), false)
  await p
})

tape('error propagation while deleting', async t => {
  const expectedError = new Error('hi')
  const set = new ConfigSet((_, cb) => {
    cb(null, {
      close: cb => cb(expectedError)
    })
  })
  await set.add('hi')
  const p = Promise.all([
    new Promise(end =>
      set.once('warning', err => {
        t.equals(err.hash, '6fMZPgk9DaBEm9SyiXiIAODQ/dY=')
        t.equals(err.config, 'hi')
        t.equals(err.cause, expectedError)
        end()
      })
    ),
    new Promise(end =>
      set.on('change', (instance, config, hash, isAdd) => {
        if (!isAdd) {
          end()
        }
      })
    )
  ])
  t.equals(await set.delete('hi'), true) // Deletion worked, its removed. Ta
  await p
})

tape('add and delete events for config to happen', t => {
  const expectedInstance = {
    close: cb => cb()
  }
  const expectedConfig = {
    hello: 'world'
  }
  const set = new ConfigSet((_, cb) => {
    cb(null, expectedInstance)
  })
  set.add(expectedConfig)
  set.once('change', (instance, config, hash) => {
    t.equals(instance, expectedInstance)
    t.equals(config, expectedConfig)
    t.equals(hash, configHash(expectedConfig))
    set.delete(expectedConfig)
    set.once('change', (instance, config, hash) => {
      t.equals(instance, expectedInstance)
      t.equals(config, expectedConfig)
      t.equals(hash, configHash(expectedConfig))
      t.end()
    })
  })
})
