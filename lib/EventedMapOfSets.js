'use strict'
const EventEmitter = require('events').EventEmitter
const DONE = require('./iter/_common').DONE
const EMPTY_ITERATOR = require('./iter/empty')

class EventedMapOfSets extends EventEmitter {
  constructor () {
    super()
    this._map = new Map()
  }

  has (key, value, hash) {
    const valueSet = this._map.get(key)
    if (valueSet === undefined) return false

    return valueSet.has(hash || value)
  }

  add (key, value, hash) {
    let valueMap = this._map.get(key)
    if (valueMap === undefined) valueMap = new Map()
    else if (valueMap.has(value)) return

    valueMap.set(hash || value, value)
    this.emit('add', key, value, hash)
  }

  get (key) {
    const valueMap = this._map.get(key)
    if (valueMap === undefined) return EMPTY_ITERATOR
    return valueMap.values()[Symbol.iterator]()
  }

  delete (key, value, hash) {
    const valueMap = this._map.get(key)
    if (valueMap === undefined) return
    if (!valueMap.has(hash || value)) return

    valueMap.delete(hash || value)
    if (valueMap.size === 0) {
      this._map.delete(key)
    }
    this.emit('delete', key, value, hash)
  }
}

module.exports = EventedMapOfSets
