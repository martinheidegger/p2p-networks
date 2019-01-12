'use strict'
const EventEmitter = require('events').EventEmitter
const createLockCb = require('flexlock-cb').createLockCb
const DiscoverySet = require('./DiscoverySet.js')
const PublishServerSet = require('./PublishServerSet.js')
const connect = require('./connect.js')
const EventedSet = require('./lib/EventedSet.js')
const Evented2DMatrix = require('./lib/Evented2DMatrix.js')

function assertIterable (property, ofObject) {
  const value = ofObject[property]
  if (value === null || value === undefined) {
    return []
  }
  if (typeof value[Symbol.iterator] === 'function') {
    return value
  }
  // TODO: Warn that the property isn't iterable
  return []
}

class ReplicationState extends EventEmitter {
  
  constructor (readKey, discoveryKey, createReplicateStream) {
    super()
    this.readKey = readKey
    this.discoveryKey = discoveryKey
    this.createReplicateStream = createReplicateStream
  }

  unlisten () {
    this._servers.forEach(server => server.unlisten())
    this._servers = new Set()
  }

  stop () {
    this.emit('stop')
  }
}

class MapOfSets extends Map {
  add (key, value) {
    let list = this.get(key)
    if (!list) {
      list = new Set()
      this.set(key, list)
    }
    list.add(value)
    return this
  }
  remove (key, value) {
    const list = this.get(key)
    if (!list) {
      return this
    }
    list.delete(value)
    if (list.size === 0) {
      this.delete(key)
    }
    return this
  }
}

const DONE = {
  done: true,
  value: null
}

class ReplicationStateSet extends ReplicationState {
  constructor (readKey, discoveryKey, createReplicationStream) {
    super (readKey, discoveryKey, createReplicationStream)
    this._states = new Map()
  }

  stop () {
    super.stop()
    this._states.forEach(state => state.stop())
  }

  delete (server) {
    const state = this._states.get(server)
    this._states.delete(server)
    return state
  }

  add (server, state) {
    this._states.set(server, state)
  }
}

class Network {
  constructor () {
    this._config = {
      paused: false,
      discovery: [],
      publishServer: []
    }
    this._lock = createLockCb()
    this._replications = new MapOfSets()
    this._keys = new EventedSet()
    this._publishServerSet = new PublishServerSet(this._keys)
    this._discoverySet = new DiscoverySet(new Evented2DMatrix(
      this._keys,
      this._publishServerSet.addresses
    ))
    this._publishServerSet.on('connection', (address, connection) => {
      // Now we need to 
    })
    this._discoverySet.on('peer', (key, peerAddress) => {
      connect(peerAddress, key, (err, connection) => {
      })
    })
  }

  replicate (readKey, discoveryKey, createReplicationStream) {
    const state = new ReplicationState(readKey, discoveryKey, createReplicationStream)
    state.once('stop', () => {
      this._keys.delete(discoveryKey)
      this._replications.remove(discoveryKey, state)
    })
    this._keys.add(discoveryKey)
    this._replications.add(discoveryKey, state)
    return state
  }

  setPaused (paused) {
    paused = !!paused
    if (this._config.paused !== paused) {
      this._config.paused = paused
      this._triggerUpdate()
      return true
    }
    return false
  }

  set paused (paused) {
    this.setPaused(paused)
  }

  get paused () {
    return this._config.paused
  }

  update (config) {
    this._config.discovery = Array.from(assertIterable('discovery', config))
    this._config.publishServer = Array.from(assertIterable('publishServer', config))
    if (!this.setPaused(config.paused)) {
      // We need an update, no matter if paused worked or not, but
      // if it works, it will trigger an update!
      this._triggerUpdate()
    }
  }

  _triggerUpdate () {
    this._discoverySet.update(this._config.paused ? [] : this._config.discovery)
    this._publishServerSet.update(this._config.paused ? [] : this._config.publishServer)
  }

  toJSON () {
    return this._config
  }
}

module.exports = Network
