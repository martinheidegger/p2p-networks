'use strict'
const EventEmitter = require('events').EventEmitter
const DONE = require('./iter/_common').DONE
const EMPTY_ITERATOR = require('./iter/empty')
const EMPTY = new Set()
class EventedMapOfSets extends EventEmitter {
  constructor () {
    super()
    this._map = new Map()
  }

  hasEntry (key, valueOrHash) {
    const valueSet = this._map.get(key)
    if (valueSet === undefined) return false
    return valueSet.has(valueOrHash)
  }

  add (key, value, hash) {
    let valueMap = this._map.get(key)
    const valueOrHash = hash || value
    if (valueMap === undefined) {
      valueMap = new Map()
      this._map.set(key, valueMap)
    }
    else if (valueMap.has(valueOrHash)) return

    valueMap.set(valueOrHash, value)
    this.emit('add', key, value, valueOrHash)
  }

  get (key) {
    const valueMap = this._map.get(key)
    if (valueMap === undefined) return EMPTY
    return valueMap.values()
  }

  delete (key, valueOrHash) {
    const valueMap = this._map.get(key)
    if (valueMap === undefined) return
    if (!valueMap.has(valueOrHash)) return

    const value = valueMap.get(valueOrHash)

    valueMap.delete(valueOrHash)
    if (valueMap.size === 0) {
      this._map.delete(key)
    }
    this.emit('delete', key, value, valueOrHash)
  }
}

module.exports = EventedMapOfSets
