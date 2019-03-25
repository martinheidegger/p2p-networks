'use strict'
const tape = require('tape-x')()
const os = require('os')
const { Networks } = require('../../lib/Networks')

let networkInterfaces
let counter = 0
let n

function reset () {
  counter = 0
  n = new Networks({ maxAge: 10000 })
}

function clear () {
  n.removeAllListeners()
}

const _backup = os.networkInterfaces

tape('mock', async t => {
  os.networkInterfaces = function () {
    counter += 1
    return networkInterfaces
  }
  t.notEquals(os.networkInterfaces, _backup)
})

tape('empty network', async t => {
  reset()
  networkInterfaces = {}
  n.on('warning', err => t.fail(err))
  n.on('change', change => t.fail(change))
  n.update()
  t.equals(counter, 1)
}, clear)

tape('local address', t => {
  networkInterfaces = {
    lo: [{
      family: 'a',
      mac: 'do'
    }]
  }
  reset()
  n.on('warning', err => t.fail(err))
  n.on('change', change => {
    t.deepEquals(change, {
      type: 'add',
      entry: {
        interfaceId: 'lo',
        family: 'a',
        mac: 'do',
        key: '["lo","do","a",0]',
        hash: '74a54c7f060b434831a8d0c3df45ccba17b0ca35'
      }
    })
    t.end()
  })
  n.update()
}, clear)

tape('add/delete', t => {
  networkInterfaces = {
    lo: [{
      family: 'a',
      mac: 'do'
    }, {
      family: 'b',
      mac: 'bo'
    }]
  }
  reset()
  n.on('warning', err => t.fail(err))
  n.update()
  networkInterfaces = {
    lo: [{
      family: 'c',
      mac: 'do'
    }, {
      family: 'b',
      address: 'x',
      mac: 'bo'
    }]
  }
  const changes = []
  n.on('change', change => {
    changes.push(change)
    if (changes.length === 3) {
      t.deepEquals(changes, [
        { type: 'add', entry: { family: 'c', mac: 'do', key: '["lo","do","c",0]', hash: '67f871cd6359b9b2cdcc321ac0a6c6d2acdae78f', interfaceId: 'lo' } },
        { type: 'update',
          newEntry: { family: 'b', mac: 'bo', address: 'x', key: '["lo","bo","b",0]', hash: '3919b087a3f56f5c4bf969bc8d765af84563abe6', interfaceId: 'lo' },
          oldEntry: { family: 'b', mac: 'bo', key: '["lo","bo","b",0]', hash: 'd98c1364c3131ab8fe28a3698baacfd88cd9f34d', interfaceId: 'lo' }
        },
        { type: 'delete', entry: { family: 'a', mac: 'do', key: '["lo","do","a",0]', hash: '74a54c7f060b434831a8d0c3df45ccba17b0ca35', interfaceId: 'lo' } },
      ])
      t.end()
    }
  })
  n.update()
}, clear)

tape('preferInternalForLocal', async t => {
  networkInterfaces = {
    lo: [{
      family: 'IPv4',
      mac: 'do',
      address: 'internal-address',
      internal: true
    }],
    eth: [{
      family: 'IPv4',
      address: 'external-address'
    }]
  }
  n.on('warning', err => t.fail(err))
  n.update()
  t.equals(n.preferInternalForLocal('IPv4', 'external-address'), 'internal-address')
  t.equals(n.preferInternalForLocal('IPv4', 'other-address'), 'other-address')
}, clear)

tape('unmock', async _ => {
  os.networkInterfaces = _backup
})
