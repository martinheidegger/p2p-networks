'use strict'
const EventEmitter = require('events').EventEmitter
const serviceLookup = require('./lib/serviceLookup.js')

const lookup = serviceLookup({
  dht: () => require('./discovery/dht')
})

class Discovery extends EventEmitter {

  static verify (opts) {
    lookup(opts)
    return true
  }

  constructor (opts) {
    super()
    this._opts = opts
    this._service = lookup(opts)(this)

    this.announce = this._service.announce.bind(this._service)
    this.unannounce = this._service.unannounce.bind(this._service)
  }

  get opts () {
    return this._opts
  }

  close (cb) {
    this.emit('close')
  }
}

module.exports = Discovery
