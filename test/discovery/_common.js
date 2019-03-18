'use strict'
const test = require('tape-x')()
const EventedMapOfSets = require('../../lib/EventedMapOfSets.js')
const EventEmitter = require('events').EventEmitter
const crypto = require('crypto')
const ipv4Peers = require('ipv4-peers')

function close (elem) {
  return new Promise((resolve, reject) => {
    elem.event.on('close', resolve)
    elem.event.once('warning', reject)
    elem.service.close()
  })
}

module.exports = ({name, setup, instantiate, tearDown, errorPrefix}) => {
  const noop = () => {}
  const bootstrap = []
  test(`${name} > before`, t => {
    setup((err, addr) => {
      if (err) {
        t.fail(err)
      }
      bootstrap.push(addr)
      t.end()
    })
  })

  function create (opts) {
    if (typeof opts === 'string') {
      opts = { name: opts }
    }

    const event = new EventEmitter()
    const peers = new EventedMapOfSets()
    const service = instantiate({
      bootstrap,
      port: 0,
      // addr: 'localhost',
      ...opts
    }, event, peers)
    return { service, event, peers }
  }

  test(`${name} > starting and closing`, t => {
    const { service, event } = create({ port: 1233 })
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

  test(`${name} > connecting to localhost`, t => {
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
      const b = create({ name: 'b', port: 1235 })
      b.event.on('warning', warn => t.fail('Warning: ' + warn))
      b.peers.on('add', (key, peer) => {
        t.equals(key, topic, 'topic matches expectation')
        t.deepEquals(ipv4Peers.decode(peer), [{
          host: '127.0.0.1',
          port: 8080
        }], 'peer matches expectations')
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

  test(`${name} > Testing distance lookup`, async t => {
    t.plan(6)
    const topic = crypto.randomBytes(32).toString('hex')
    const a = create({
      name: 'a',
      port: 3456
    })
    const b = create({
      name: 'b',
      port: 3457
    })
    b.event.on('warning', function (warn) {
      t.fail(`Unexpected warning: ${warn}`)
    })

    await Promise.all([
      new Promise(resolve => {
        a.event.on('listening', function () {
          t.pass('listening event broadcast')
          resolve()
        })
      }),
      new Promise(resolve => {
        a.service.open()
        a.service.announce(topic, {
          port: 1234,
          // localAddress: { port: 1234, host: '127.0.0.1' }
        }, err => {
          t.equals(err, null, 'no error in announce')
          resolve()
        })
        a.event.on('warning', function (warn) {
          t.equals(warn.code, `E${errorPrefix}QUERY`, 'warning received because b wasnt started yet')
          resolve()
        })
      })
    ])
  
    b.service.open()

    await Promise.all([
      new Promise(resolve => {
        b.peers.on('add', (key, peer, hash) => {
          t.equals(key, topic, 'we should have found the peer for the topic!')
          t.deepEquals(ipv4Peers.decode(peer), [{
            host: '127.0.0.1',
            port: 1234
          }], 'the peer matches our expectations')
          t.equals(hash, 'fwAAAQTS', 'the peers hash also matches our expectations')
          resolve()
        })
      }),
      new Promise(resolve => {
        b.service.lookup(topic, () => {
          t.pass('lookup done')
          resolve()
        })
      })
    ])
    await Promise.all([
      close(a),
      close(b)
    ])
  })

  test(`${name} > after`, t => tearDown(() => t.end()))
}
