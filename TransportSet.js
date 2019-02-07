'use strict'
const { Transport, TransportState } = require('./Transport.js')
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
  if (a === TransportState.CONNECTED || b === TransportState.CONNECTED) {
    return TransportState.CONNECTED
  }
  if (a === TransportState.CONNECTING || b === TransportState.CONNECTING) {
    return TransportState.CONNECTING
  }
  if (a === TransportState.BROKEN || b === TransportState.BROKEN) {
    return TransportState.BROKEN
  }
  return TransportState.EMPTY
}

class TransportSet extends ConfigSet {
  constructor (keys) {
    super(opts => {
      const transport = new Transport(opts, keys)
      if (this.isGatheringTraffic) {
        transport.on('traffic', this.gatherTraffic)
      }
      this._addresses.add(transport.addresses)
      transport.on('state', state => this._setState(transport, state))
      transport.on('connection', (address, connection) => this.emit('connection', address, connection))
      return {
        close: cb => {
          this._addresses.delete(transport.addresses)
          transport.close(err => {
            if (err) return cb(err)
            this._setState(transport, null)
            transport.removeAllListeners()
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
    const state = reduce(this._states, reduceState, TransportState.EMPTY)
    if (state !== this._state) {
      this._state = state
      this.emit('state', state)
    }
  }
}

module.exports = TransportSet
