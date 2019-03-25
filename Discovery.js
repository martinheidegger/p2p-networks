'use strict'
const EventEmitter = require('events').EventEmitter
const serviceLookup = require('./lib/serviceLookup.js')
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

const noop = () => {}

class Discovery extends EventEmitter {
  static State = State

  validate (services, config) {
    serviceLookup(services, config) // validation happens here!
  }

  constructor (services, config, peers, keyByAddress) {
    super()
    this._config = config
    const { ... serviceConfig } = config
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
    const isActive = stateMgr(isActive => {
      toggleListener(keyByAddress, 'change', checkState, isActive)
    }, false)

    function onKeyAddress (key, address, isAdded) {
      service.toggleAnnounce(key, address, isAdded, noop)
    }
    function onKey (key, isAdded) {
      service.toggleSearch(key, isAdded, noop)
    }
    const isAnnouncing = stateMgr(active => {
      toggleListener(keyByAddress, 'change', onKeyAddress, active)
      for (const [key, address] of keyByAddress) {
        service.toggleAnnounce(key, address, active, noop)
      }
    }, false)
    const isLookup = stateMgr(active => {
      toggleListener(keyByAddress, 'key', onKey, active)
      for (const key of keyByAddress.keys) {
        service.toggleSearch(key, active, noop)
      }
    }, false)
    const state = stateMgr(state => {
      if (logActive) this.emit('log', { type: 'state-change', state })
      isLookup.set(state === State.lookup || state === State.announce)
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
