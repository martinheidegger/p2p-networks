'use strict'
const EventEmitter = require('events').EventEmitter
const createLockCb = require('flexlock-cb').createLockCb
const EMPTY = new Set()
class EventedMapOfSets extends EventEmitter {
  constructor () {
    super()
    this._map = new Map()
    this._lock = createLockCb()
  }

  hasEntry (key, valueOrHash) {
    const valueSet = this._map.get(key)
    if (valueSet === undefined) return false
    return valueSet.has(valueOrHash)
  }

  add (key, value, hash, cb) {
    return this._lock.sync(() => {
      let valueMap = this._map.get(key)
      const valueOrHash = hash || value
      if (valueMap === undefined) {
        valueMap = new Map()
        this._map.set(key, valueMap)
      }
      else if (valueMap.has(valueOrHash)) return false
  
      valueMap.set(valueOrHash, value)
      this.emit('add', key, value, valueOrHash)
      return true
    }, cb)
  }

  * [Symbol.iterator] () {
    if (this._map.size === 0) {
      return
    }
    for (const key of this._map.keys()) {
      for (const value of this._map.get(key).values()) {
        yield { key, value }
      }
    }
  }

  keys () {
    return this._map.keys()
  }

  get (key) {
    const valueMap = this._map.get(key)
    if (valueMap === undefined) return EMPTY
    return valueMap.values()
  }

  delete (key, valueOrHash, cb) {
    return this._lock.sync(() => {
      const valueMap = this._map.get(key)
      if (valueMap === undefined) return false
      if (!valueMap.has(valueOrHash)) return false

      const value = valueMap.get(valueOrHash)
      valueMap.delete(valueOrHash)
      if (valueMap.size === 0) {
        this._map.delete(key)
      }
      this.emit('delete', key, value, valueOrHash)
      return true
    }, cb)
  }

  clear (cb) {
    return this._lock.sync(() => {
      for (const key of this._map.keys()) {
        for (const value of this._map.get(key).values()) {
          this.emit('delete', key, value, value)
        }
      }
      this._map = new Map()
    }, cb)
  }
}

module.exports = EventedMapOfSets
