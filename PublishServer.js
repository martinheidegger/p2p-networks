'use strict'
const EventEmitter = require('events').EventEmitter
const serviceLookup = require('./lib/serviceLookup.js')

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
    lookup(config)
    return true
  }

  constructor (config) {
    super()
    this._config = config
    this._service = lookup(config)(this)
    this.replicate = this.replicate.bind(this)
    this.handshake = this.handshake.bind(this)
  }

  get config () {
    return this._config
  }

  close (client) {
    this._service.close(client)
  }
}

exports.PublishServerState = PublishServerState
exports.PublishServer = PublishServer
