'use strict'
const discoveryTest = require('./_common.js')
const EventedMapOfSets = require('../../lib/EventedMapOfSets.js')
const EventEmitter = require('events').EventEmitter
const dns = require('../../discovery/dns.js')

const defaults = {
  domain: 'p2p-networks.martinheidegger',
  keySize: 64
}

const event = new EventEmitter()
const node = dns.create({
  name: 'default',
  port: 5353,
  refreshInterval: 100,
  ... defaults
}, event, new EventedMapOfSets())

discoveryTest({
  name: 'dns',
  errorPrefix: 'DNS',
  setup (cb) {
    node.open()
    event.on('listening', () => {
      cb(null, null)
    })
  },
  instantiate (opts, event, peers) {
    return dns.create({
      ...opts,
      ...defaults,
      refreshInterval: 100,
      port: 5353
    }, event, peers)
  },

  tearDown (cb) {
    node.close()
    cb()
  }
})
