'use strict'
const test = require('tape-x')()
const dht = require('../../discovery/dht-legacy.js')
const EventedMapOfSets = require('../../lib/EventedMapOfSets.js')
const EventEmitter = require('events').EventEmitter
const Evented2DMatrix = require('../../lib/Evented2DMatrix.js')
const EventedSet = require('../../lib/EventedSet.js')
const crypto = require('crypto')
const createDht = require('bittorrent-dht')
const ipv4Peers = require('ipv4-peers')

const noop = () => {}
const bootstrap = []
const node = createDht({
  bootstrap: false
})
let keys
let keyByAddress
let addresses
test('before', t => {
  keys = new EventedSet()
  addresses = new EventedSet()
  keyByAddress = new Evented2DMatrix(keys, addresses)
  node.listen(0, () => {
    const addr = node.address()
    bootstrap.push('127.0.0.1:' + addr.port)
    t.end()
  })
})

function create (name, opts) {
  const event = new EventEmitter()
  const peers = new EventedMapOfSets()
  const service = dht.create(Object.assign({}, opts, { bootstrap, name }), event, peers, keyByAddress)
  return { service, event, peers }
}

/*
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
*/

test('connecting to localhost', t => {
  const a = create('a', { checkInterval: 5 })
  a.event.on('listening', function () {
    const topic = crypto.randomBytes(32).toString('hex')
    const server = {
      port: 8080,
      localAddress: { port: '8080', host: '127.0.0.1' }
    }
    addresses.add(server)
    a.service.announce(topic, server, function () {
      b.service.lookup(topic, noop)
    })
    const b = create('b')
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
