'use strict'
const EventEmitter = require('events').EventEmitter
const createLockCb = require('flexlock-cb').createLockCb
const DiscoverySet = require('./DiscoverySet.js')
const PublishServerSet = require('./PublishServerSet.js')
const connect = require('./connect.js')

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

class Evented2DMatrix extends EventEmitter {
  constructor (a, b) {
    super()
    a.on('add', aValue => {
      for (const bValue of b) {
        this.emit('add', aValue, bValue)
      }
    })
    a.on('remove', aValue => {
      for (const bValue of b) {
        this.emit('remove', aValue, bValue)
      }
    })
    b.on('add', bValue => {
      for (const aValue of a) {
        this.emit('add', aValue, bValue)
      }
    })
    b.on('remove', bValue => {
      for (const aValue of a) {
        this.emit('remove', aValue, bValue)
      }
    })
    this._a = a
    this._b = b
  }

  entries () {
    const aIter = this._a[Symbol.iterator]()
    if (this._a.size === 0 || this._b.size === 0) {
      return DONE
    }
    let aState = aIter.next()
    let bIter = null
    return {
      next: function() {
        if (aState.done) {
          return DONE
        }
        if (bIter === null) {
          bIter = this._b[Symbol.iterator]()
        }
        let bState = bIter.next()
        if (bState.done) {
          aState = aIter.next()
          if (aState.done) {
            return DONE
          }
          bIter = this._b[Symbol.iterator]()
          bState = bIter.next()
        }
        return {
          done: false,
          value: [aState.value, bState.value]
        }
      }
    }
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
    this._publishServerSet = new PublishServerSet()
    
    this._discoverySet = new DiscoverySet(new AddressAndKeyCombination(
      this._publishServerSet.addresses,
      this._replications
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
      this._discoverySet.removeKey(discoveryKey)
      this._replications.remove(discoveryKey, state)
    })
    this._discoverySet.addKey(discoveryKey)
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
