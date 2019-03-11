'use strict'
const test = require('tape-x')()
const dht = require('../../discovery/dht.js')
const EventedMapOfSets = require('../../lib/EventedMapOfSets.js')
const EventEmitter = require('events').EventEmitter
const crypto = require('crypto')
const DHT = require('dht-rpc')
const ipv4Peers = require('ipv4-peers')

const noop = () => {}
const bootstrap = []
const node = DHT({
  ephemeral: true
})
test('before', t => {
  node.listen(0, () => {
    const addr = node.address()
    bootstrap.push(addr.address + ':' + addr.port)
    t.end()
  })
})

function create () {
  const event = new EventEmitter()
  const peers = new EventedMapOfSets()
  const service = dht.create({ bootstrap }, event, peers)
  return { service, event, peers }
}

test('starting and closing', t => {
  const { service, event } = create()
  const stack = []
  service.open()
  event.on('listening', function () {
    stack.push('listening')
    service.close()
  })
  event.on('close', function () {
    t.deepEquals(stack, ['listening'])
    t.end()
  })
})

test('connecting to localhost', t => {
  const a = create()
  a.event.on('listening', function () {
    const topic = crypto.randomBytes(32).toString('hex')
    a.service.announce(topic, {
      port: '8080',
      localAddress: { port: '8080', host: '127.0.0.1' }
    }, () => {
      b.service.lookup(topic, noop)
    })
    const b = create()
    b.event.on('warning', function (warn) {
      console.log(warn)
    })
    b.peers.on('add', (key, peer) => {
      t.equals(key, topic)
      t.deepEquals(ipv4Peers.decode(peer), [{
        host: '127.0.0.1',
        port: 8080
      }])
      setImmediate(() => {
        a.service.close()
        b.service.close()
        t.end()
      })
    })
    b.service.open()
  })
  a.event.on('warning', function (warn) {
    console.log(warn)
  })
  a.service.open()
})

test('after', t => {
  node.destroy()
  t.end()
})
