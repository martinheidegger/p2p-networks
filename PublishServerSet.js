'use strict'
const { PublishServer, PublishServerState } = require('./PublishServer.js')
const EventedSet = require('./EventedSet.js')
const listenerChange = require('./lib/listenerChange.js')

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

function reduce (iterable, operation, start) {
  const iter = iterable[Symbol.iterator]()
  let result = start
  let next
  while((next = iter.next()) && !next.done) {
    result = operation(result, next.value)
  }
  return result
}

const DONE = {
  value: null,
  done: true
}

function map (iterable, operation) {
  const iter = iterable[Symbol.iterator]()
  return {
    next: function () {
      const current = iter.next()
      if (current.done) return DONE
      return {
        done: false,
        value: operation(iter.value)
      }
    }
  }
}

function reduceState (a, b) {
  if (a === PublishServerState.CONNECTED || b === PublishServerState.CONNECTED) {
    return PublishServerState.CONNECTED
  }
  if (a === PublishServerState.CONNECTING || b === PublishServerState.CONNECTING) {
    return PublishServerState.CONNECTING
  }
  if (a === PublishServerState.BROKEN || b === PublishServerState.BROKEN) {
    return PublishServerState.BROKEN
  }
  return PublishServerState.EMPTY
}

class PublishServerSet extends EventedSet {
  constructor () {
    super(opts => {
      const publishServer = new PublishServer(opts)
      if (this.isGatheringTraffic) {
        publishServer.on('traffic', this.gatherTraffic)
      }
      publishServer.on('listen', address => this.emit('listen', address))
      publishServer.on('unlisten', address => this.emit('unlisten', address))
      publishServer.on('state', state => this._setState(publishServer, state))
      publishServer.on('connection', (address, connection) => this.emit('connection', address, connection))
      return {
        replicate: publishServer.replicate,
        close: cb => {
          this._replications.forEach(replicationState => {
            const replication = replicationState.delete(publishServer)
            return replication.stop()
          })
          publishServer.close(err => {
            if (err) return cb(err)
            this._setState(publishServer, null)
            publishServer.removeAllListeners()
            return cb()
          })
        }
      }
    })

    this._state = PublishServerState.EMPTY
    this._states = new Map()
    this._replications = new Set()
    this.listen = this.listen.bind(this)
    this.unlisten = this.unlisten.bind(this)
    this.gatherTraffic = this.gatherTraffic.bind(this)

    this.isGatheringTraffic = false
    listenerChange(this, 'traffic', hasListener => {
      this.isGatheringTraffic = hasListener
      this._instances.forEach(serverSurface => {
        if (hasListener) {
          serverSurface.on('traffic', this.gatherTraffic)
        } else {
          serverSurface.removeListener('traffic', this.gatherTraffic)
        }
      })
    })
  }

  _setState (server, serverState) {
    if (serverState === null) {
      this._states.delete(server)
    } else {
      this._states.set(server, serverState)
    }
    const state = reduce(this._states, reduceState, PublishServerState.EMPTY)
    if (state !== this._state) {
      this._state = state
      this.emit('state', state)
    }
  }

  replicate (readKey, discoveryKey, createReplicationStream) {
    if (typeof discoveryKey === 'function') {
      return this.listen(readKey, null, createReplicationStream)
    }
    if (!discoveryKey) {
      // TODO: generate Key
    }
    const state = new ReplicationStateSet(readKey, discoveryKey, createReplicationStream)
    state.once('stop', () => this._replications.delete(state))
    this._replications.add(state)
    this._instances.forEach(
      publishServer => {
        state.add(publishServer, publishServer.replicate(readKey, discoveryKey, createReplicationStream))
      }
    )
    return state
  }
}

module.exports = PublishServerSet
