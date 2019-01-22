'use strict'
const EventEmitter = require('events').EventEmitter
const serviceLookup = require('./lib/serviceLookup.js')
const EventedMapOfSets = require('./lib/EventedMapOfSets.js')

const services = serviceLookup({
  dht: () => require('./discovery/dht'),
  dns: () => require('./discovery/dns')
})

function stateMgr (onChange, state) {
  return {
    state,
    set: function setState (newState) {
      if (state !== newState) {
        let oldState = state
        state = newState
        onChange(newState, oldState)
      }
    }
  }
}

class Discovery extends EventEmitter {
  static STATE_ANNOUNCE = Symbol('announce - Publications available to announce, lets share this with the network')
  static STATE_LOOKUP = Symbol('lookup - No publication available, lets use lookup to see if we can find some peer anyways.')
  static STATE_CLOSED = Symbol('closed')
  static STATE_WAITING = Symbol('waiting - No connection available')

  static verify (config) {
    return services(config).verify()
  }

  constructor (config, keyByAddress) {
    super()
    this._config = config
    this._peers = new EventedMapOfSets()
    this.closed = new Promise(resolve => this.on('close', resolve))

    const service = services(config).create(this, this._peers)
    const removeKeyAdress = (key, address) => {
      service.unannounce(key, address)
      if (keyByAddress.y.size === 0) {
        state.set(Discovery.STATE_LOOKUP)
      }
    }
    const setStateToAnnounce = () => {
      state.set(Discovery.STATE_ANNOUNCE)
    }
    const unlistening = () => {
      state.set(Discovery.STATE_WAITING)
      setTimeout(() => service.open(), config.reconnect)
    }
    const listening = () => state.set(keyByAddress.y.size === 0 ? Discovery.STATE_LOOKUP : Discovery.STATE_ANNOUNCE)
    const state = stateMgr((newState, oldState) => {
      switch (oldState) {
        case Discovery.STATE_ANNOUNCE:
          keyByAddress.removeListener('add', service.announce)
          keyByAddress.removeListener('remove', removeKeyAdress)
          break
        case Discovery.STATE_LOOKUP:
          keyByAddress.x.removeListener('add', service.lookup)
          keyByAddress.y.removeKeyAdress('add', setStateToAnnounce)
          break
      }
      switch (newState) {
        case Discovery.STATE_ANNOUNCE:
          keyByAddress.addListener('add', service.announce)
          keyByAddress.addListener('remove', removeKeyAdress)
          for (const tuple of keyByAddress) {
            service.announce(tuple[0], tuple[1])
          }
          break
        case Discovery.STATE_LOOKUP:
          keyByAddress.x.addListener('add', service.lookup)
          keyByAddress.y.addListener('add', setStateToAnnounce)
          for (const key of keyByAddress.x) {
            service.lookup(key)
          }
          break
        case Discovery.STATE_CLOSED:
          service.close()
          this.removeListener('listening', listening)
          this.removeListener('unlistening', unlistening)
          break
      }
    }, Discovery.STATE_WAITING)

    this._state = state
    this.on('listening', listening)
    this.on('unlistening', unlistening)
    service.open()
  }

  get peers () {
    return this._peers
  }

  get config () {
    return this._config
  }

  close (cb) {
    this._state.set(Discovery.STATE_CLOSED)
    if (cb) {
      return this.closed.then(cb)
    }
  }
}

module.exports = Discovery
