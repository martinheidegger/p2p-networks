'use strict'
const { PublishServer, PublishServerState } = require('./PublishServer.js')
const ConfigSet = require('./ConfigSet.js')
const listenerChange = require('./lib/listenerChange.js')
const EventedSetOfSets = require('./lib/EventedSetOfSets.js')

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

class PublishServerSet extends ConfigSet {
  constructor (keys) {
    super(opts => {
      const publishServer = new PublishServer(opts, keys)
      if (this.isGatheringTraffic) {
        publishServer.on('traffic', this.gatherTraffic)
      }
      this._addresses.add(publishServer.addresses)
      publishServer.on('state', state => this._setState(publishServer, state))
      publishServer.on('connection', (address, connection) => this.emit('connection', address, connection))
      return {
        close: cb => {
          this._addresses.delete(publishServer.addresses)
          publishServer.close(err => {
            if (err) return cb(err)
            this._setState(publishServer, null)
            publishServer.removeAllListeners()
            return cb()
          })
        }
      }
    })

    this._addresses = new EventedSetOfSets()
    this._states = new Map()
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

  get addresses () {
    return this._addresses
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
}

module.exports = PublishServerSet
