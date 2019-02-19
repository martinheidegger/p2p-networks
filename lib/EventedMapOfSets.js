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
    return this._lock(cb => {
      let valueMap = this._map.get(key)
      const valueOrHash = hash || value
      if (valueMap === undefined) {
        valueMap = new Map()
        this._map.set(key, valueMap)
      }
      else if (valueMap.has(valueOrHash)) return cb(null, false)
  
      valueMap.set(valueOrHash, value)
      this.emit('add', key, value, valueOrHash)
      cb(null, true)
    }, cb)
  }

  get (key) {
    const valueMap = this._map.get(key)
    if (valueMap === undefined) return EMPTY
    return valueMap.values()
  }

  delete (key, valueOrHash, cb) {
    return this._lock(cb => {
      const valueMap = this._map.get(key)
      if (valueMap === undefined) return cb(null, false)
      if (!valueMap.has(valueOrHash)) return cb(null, false)

      const value = valueMap.get(valueOrHash)
      valueMap.delete(valueOrHash)
      if (valueMap.size === 0) {
        this._map.delete(key)
      }
      this.emit('delete', key, value, valueOrHash)
      cb(null, true)
    }, cb)
  }

  clear (cb) {

    return this._lock(cb => {
      for (const key of this._map.keys()) {
        for (const value of this._map.get(key).values()) {
          this.emit('delete', key, value, value)
        }
      }
      this._map = new Map()
      cb()
    }, cb)
  }
}

module.exports = EventedMapOfSets
