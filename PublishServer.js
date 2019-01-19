'use strict'
const EventEmitter = require('events').EventEmitter
const serviceLookup = require('./lib/serviceLookup.js')
const EventedSet = require('./lib/EventedSet.js')

const lookup = serviceLookup({
  tcp: () => require('./publish/tcp')
})

const PublishServerState = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  CLOSING: 'closing',
  EMPTY: 'empty',
  BROKEN: 'broken'
}

class PublishServer extends EventEmitter {
  static verify (config) {
    return lookup(config).verify()
  }

  constructor (config, keys) {
    super()
    this._config = config
    const addresses = new EventedSet()
    this._addresses = addresses
    this._service = lookup(config).create(this, keys, addresses)
  }

  get addresses () {
    return this._addresses
  }

  get config () {
    return this._config
  }

  close (cb) {
    this._service.close(cb)
  }
}

exports.PublishServerState = PublishServerState
exports.PublishServer = PublishServer
