'use strict'
const test = require('tape-x')()
const dht = require('../../discovery/dht.js')
const EventedMapOfSets = require('../../lib/EventedMapOfSets.js')
const Evented2DMatrix = require('../../lib/Evented2DMatrix.js')
const EventedSet = require('../../lib/EventedSet.js')
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

function create (opts) {
  if (typeof opts === 'string') {
    opts = { name: opts }
  }
  const event = new EventEmitter()
  const peers = new EventedMapOfSets()
  const keyByAddress = new Evented2DMatrix(new EventedSet(), new EventedSet())
  const service = dht.create({
    bootstrap,
    port: 0,
    // addr: 'localhost',
    ...opts
  }, event, peers, keyByAddress)
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

test('testing interval lookup', t => {
  t.plan(4)
  const topic = crypto.randomBytes(32).toString('hex')
  const a = create({
    name: 'a',
    port: 3456
  })
  const peerKnownByA = ipv4Peers.encode([{ port: 1234, host: '192.168.1.0' }])
  a.peers.add(topic, peerKnownByA, peerKnownByA.asString)
  a.event.on('listening', function () {
    a.service.announce(topic, {
      port: '1234',
      localAddress: { port: '1234', host: '127.0.0.1' }
    }, () => {
      b.service.lookup(topic, noop)
    })
    const b = create({
      name: 'b',
      port: 3457
    })
    setImmediate(() => {
      b.event.on('warning', function (warn) {
        console.log('↓ WARN2 ↓')
        console.log(warn)
      })
      b.peers.on('add', (key, peer, hash) => {
        t.equals(key, topic, 'we should have found the peer for the topic!')
        t.deepEquals(ipv4Peers.decode(peer), [{
          host: '192.168.1.0',
          port: 1234
        }], 'the peer matches our expectations')
        t.equals(hash, 'wKgBAATS', 'the peers hash also matches our expectations')
        setImmediate(async () => {
          await a.service.close()
          await b.service.close()
          t.end()
        })
      })
      b.service.open()
    })
  })
  a.event.on('warning', function (warn) {
    t.pass('warning received because b wasnt started yet')
  })
  a.service.open()
})

test('after', t => {
  node.destroy()
  t.end()
})
