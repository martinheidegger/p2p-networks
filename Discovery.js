'use strict'
const EventEmitter = require('events').EventEmitter
const serviceLookup = require('./lib/serviceLookup.js')
const rangeInterval = require('./lib/rangeInterval.js')
const stateMgr = require('./lib/stateMgr.js')
const hasListener = require('./lib/hasListener.js')
const toggleListener = require('./lib/toggleListener.js')

const State = Object.freeze({
  announce: Symbol('announce'), // Publications available to announce, lets share this with the network
  lookup: Symbol('lookup'), // No publication available, lets use lookup to see if we can find some peer anyways
  inactive: Symbol('inactive'), // Nothing to look for, nothing to offer. Waiting for either
  closed: Symbol('closed'), // Already closed
  waiting: Symbol('waiting') // No connection available: Waiting for the setup to be ready
})

const ACTIVE_STATES = [State.announce, State.lookup, State.inactive]

class Discovery extends EventEmitter {
  static State = State

  validate (services, config) {
    serviceLookup(services, config) // validation happens here!
  }

  constructor (services, config, peers, keyByAddress) {
    super()
    this._config = config
    const { lookupInterval: configLookupInterval, ... serviceConfig } = config
    const lookupRange = rangeInterval.parse(configLookupInterval)
    this.closed = new Promise(resolve => this.once('close', resolve))
    const service = serviceLookup(services, serviceConfig).create(this, peers)
    let logActive = false
    const closeLog = hasListener(this, 'log', isActive => logActive = isActive)
    const unlistening = () => {
      if (logActive) this.emit('log', { type: 'unlistening' })
      state.set(State.waiting)
      setTimeout(() => service.open(), config.reconnect)
    }
    const checkState = () => {
      if (keyByAddress.keys.size === 0) {
        return state.set(State.inactive)
      }
      if (keyByAddress.values.size === 0) {
        return state.set(State.lookup)
      }
      state.set(State.announce)
    }
    const lookup = () => {
      if (logActive) this.emit('log', { type: 'lookup' })
      for (const key of keyByAddress.keys) {
        service.lookup(key)
      }
    }
    const isActive = stateMgr(isActive => {
      toggleListener(keyByAddress, 'add', checkState, isActive)
      toggleListener(keyByAddress, 'remove', checkState, isActive)
    }, false)
    const isAnnouncing = stateMgr(isAnnouncing => {
      toggleListener(keyByAddress, 'add', service.announce, isAnnouncing)
      toggleListener(keyByAddress, 'remove', service.unannounce, isAnnouncing)
      if (isAnnouncing) {
        for (const [key, address] of keyByAddress) {
          service.announce(key, address)
        }
      }
    }, false)
    let lookupInterval
    const isLookup = stateMgr(isLookup => {
      if (isLookup) {
        lookupInterval = rangeInterval.set(lookup, lookupRange)
        lookup()
      } else {
        rangeInterval.clear(lookupInterval)
      }
    }, false)
    const state = stateMgr(state => {
      if (logActive) this.emit('log', { type: 'state-change', state })
      isLookup.set(state === State.lookup)
      isAnnouncing.set(state === State.announce)
      isActive.set(ACTIVE_STATES.includes(state))
      if (state === State.closed) {
        this.removeListener('listening', checkState)
        this.removeListener('unlistening', unlistening)
        service.close()
        this.once('close', () => {
          if (logActive) this.emit('log', { type: 'closed' })
          closeLog()
        })
      }
    }, State.waiting)

    this._state = state
    this.on('listening', checkState)
    this.on('unlistening', unlistening)
    service.open()
  }

  get config () {
    return this._config
  }

  get state () {
    return this._state.get()
  }

  close (cb) {
    this._state.set(State.closed)
    if (cb) {
      return this.closed.then(cb)
    }
    return this.closed
  }
}

module.exports = Discovery
