'use strict'
const EventEmitter = require('events').EventEmitter
const serviceLookup = require('./lib/serviceLookup.js')
const EventedSet = require('./lib/EventedSet.js')

const TransportState = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  CLOSING: 'closing',
  EMPTY: 'empty',
  BROKEN: 'broken'
}

class Transport extends EventEmitter {

  constructor (services, config, keys) {
    super()
    this._config = config
    const addresses = new EventedSet()
    this._addresses = addresses
    this._service = serviceLookup(services, config).create(this, keys, addresses)
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

exports.TransportState = TransportState
exports.Transport = Transport
