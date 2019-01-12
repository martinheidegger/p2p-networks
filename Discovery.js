'use strict'
const EventEmitter = require('events').EventEmitter
const serviceLookup = require('./lib/serviceLookup.js')
const createLockCb = require('flexlock-cb').createLockCb

const lookup = serviceLookup({
  dht: () => require('./discovery/dht')
})

class Discovery extends EventEmitter {

  static verify (config) {
    return lookup(config).verify(config)
  }

  constructor (config, keyAddressSet) {
    super()
    this._config = config
    this._service = lookup(config).create(this, keyAddressSet)
    this._keyAddressSet = keyAddressSet
    this._lock = createLockCb()
    this._lock(unlock => this._service.connect(unlock), 0, err => {
      // TODO: what to do here?
    })
    this._addKeyAddress = this._addKeyAddress.bind(this)
    this._removeKeyAdress = this._removeKeyAdress.bind(this)
    keyAddressSet.addListener('add', this._addKeyAddress)
    keyAddressSet.addListener('remove', this._removeKeyAdress)
  }

  get config () {
    return this._config
  }

  _addKeyAddress (key, address) {
    this._lock()
    this._service.announce(key, address)
  }

  _removeKeyAdress (key, address) {
    this._service.unannounce(key, address)
  }

  close (cb) {
    this._keyAddressSet.removeListener('add', this._addKeyAddress)
    this._keyAddressSet.removeListener('remove', this._removeKeyAdress)
    this._service.close(cb)
  }
}

module.exports = Discovery
