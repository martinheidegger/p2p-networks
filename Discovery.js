'use strict'
const EventEmitter = require('events').EventEmitter
const serviceLookup = require('./lib/serviceLookup.js')
const EventedMapOfSets = require('./lib/EventedMapOfSets.js')
const rangeInterval = require('./lib/rangeInterval.js')

const services = serviceLookup({
  "dht-legacy": () => require('./discovery/dht-legacy'),
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

const LOOKUP = {
  IDLE: Symbol('Idle.'),
  ACTIVE: Symbol('Sending a lookup event following an interval'),
  INACTIVE: Symbol('Waiting for keys to exist before activation')
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

    const service = services(config).create(this, this._peers, keyByAddress)
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
    const activateLookup = () => {
      lookupState.set(LOOKUP.ACTIVE)
    }
    const testDeactivateLookup = () => {
      if (keyByAddress.x.size > 0) return
      lookupState.set(LOOKUP.INACTIVE)
    }
    const lookupRange = rangeInterval.parse(config.lookupInterval || '10~15min')
    let lookupInterval
    const lookupState = stateMgr((newState, oldState) => {
      switch (oldState) {
        case LOOKUP.ACTIVE:
          rangeInterval.clear(lookupInterval)
          keyByAddress.x.removeListener('add', service.lookup)
          keyByAddress.x.removeListener('remove', testDeactivateLookup)
          break
        case LOOKUP.INACTIVE:
          keyByAddress.x.removeListener('add', activateLookup)
          break
      }
      switch (newState) {
        case LOOKUP.ACTIVE:
          keyByAddress.x.on('remove', testDeactivateLookup)
          keyByAddress.x.on('add', service.lookup)
          for (const key of keyByAddress.x) {
            service.lookup(key)
          }
          lookupInterval = rangeInterval.set(() => {
            for (const key of keyByAddress) {
              service.lookup(key)
            }
          }, lookupRange)
          break
        case LOOKUP.INACTIVE:
          keyByAddress.x.on('add', activateLookup)
          break
      }
    }, LOOKUP.IDLE)
    const listening = () => state.set(keyByAddress.y.size === 0 ? Discovery.STATE_LOOKUP : Discovery.STATE_ANNOUNCE)
    const state = stateMgr((newState, oldState) => {
      switch (oldState) {
        case Discovery.STATE_ANNOUNCE:
          keyByAddress.removeListener('add', service.announce)
          keyByAddress.removeListener('remove', removeKeyAdress)
          break
        case Discovery.STATE_LOOKUP:
          lookupState.set(LOOKUP.IDLE)
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
          lookupState.set(keyByAddress.x.size > 0 ? LOOKUP.ACTIVE : LOOKUP.INACTIVE)
          keyByAddress.y.addListener('add', setStateToAnnounce)
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
