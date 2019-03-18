'use strict'
const discoveryTest = require('./_common.js')
const EventedMapOfSets = require('../../lib/EventedMapOfSets.js')
const EventEmitter = require('events').EventEmitter
const dht = require('../../discovery/dht.js')

const event = new EventEmitter()
const node = dht.create({
  bootstrap: [],
  port: 3333,
  addr: undefined
}, event, new EventedMapOfSets())

discoveryTest({
  name: 'dht',
  errorPrefix: 'DHT',
  setup (cb) {

    node.open()
    event.on('listening', () => {
      cb(null, `127.0.0.1:3333`)
    })
  },
  instantiate (opts, event, peers) {
    return dht.create(opts, event, peers)
  },

  tearDown (cb) {
    node.close()
    cb()
  }
})
