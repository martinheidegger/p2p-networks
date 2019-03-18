'use strict'
const test = require('tape-x')()
const dht = require('../../discovery/dht.js')
const EventedMapOfSets = require('../../lib/EventedMapOfSets.js')
const EventEmitter = require('events').EventEmitter
const crypto = require('crypto')
const ipv4Peers = require('ipv4-peers')

const noop = () => {}
const bootstrap = []
const node = create({
  bootstrap: [],
  port: 3333
})
test('before', t => {
  node.service.open()
  node.event.on('listening', () => {
    bootstrap.push(`127.0.0.1:3333`)
    t.end()
  })
})

function create (opts) {
  if (typeof opts === 'string') {
    opts = { name: opts }
  }
  const event = new EventEmitter()
  const peers = new EventedMapOfSets()
  const service = dht.create({
    bootstrap,
    port: 0,
    // addr: 'localhost',
    ...opts
  }, event, peers)
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
  const a = create({ name: 'a', port: 1234 })
  a.event.on('listening', function () {
    const topic = crypto.randomBytes(32).toString('hex')
    const server = {
      port: 8080,
      localAddress: { port: '8080', host: '127.0.0.1' }
    }
    a.service.announce(topic, server, () =>
      b.service.lookup(topic, noop)
    )
    const b = create('b')
    b.event.on('warning', warn => t.fail('Warning: ' + warn))
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
  a.event.on('warning', warn => t.fail(warn))
  a.service.open()
})

test('testing interval lookup', t => {
  t.plan(5)
  const topic = crypto.randomBytes(32).toString('hex')
  const a = create({
    name: 'a',
    port: 3456
  })
  a.event.on('listening', function () {
    t.pass('listening event broadcast')
    const address = {
      port: 1234,
      // localAddress: { port: '1234', host: '127.0.0.1' }
    }
    a.service.announce(topic, address, () => {
      t.pass('announce done, looking up topic')
      b.service.lookup(topic, noop)
    })
    const b = create({
      name: 'b',
      port: 3457
    })
    setImmediate(() => {
      b.event.on('warning', function (warn) {
        t.fail(`Unexpected warning: ${warn}`)
      })
      b.peers.once('add', (key, peer, hash) => {
        t.equals(key, topic, 'we should have found the peer for the topic!')
        t.deepEquals(ipv4Peers.decode(peer), [{
          host: '127.0.0.1',
          port: 1234
        }], 'the peer matches our expectations')
        t.equals(hash, 'fwAAAQTS', 'the peers hash also matches our expectations')
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
    t.equals(warn.code, 'EDHTQUERY')
    t.pass('warning received because b wasnt started yet')
  })
  a.service.open()
})

test('after', t => {
  node.service.close()
  node.event.on('close', () => {
    t.end()
  })
})
