'use strict'
const EventEmitter = require('events').EventEmitter
class EventedMergedMap extends EventEmitter {
  constructor () {
    super()
    this._maps = new Set()
    this._map = new Map()
    this._addItem = (key, value) => {
    }
    this._deleteItem = (key, value) => {
    }
  }

  add (map) {
    if (this._maps.has(map)) return
    this._maps.add(map)
    map.on('add', this._addItem)
    map.on('delete', this._deleteItem)
  }

  delete (map) {
    if (!this._maps.has(map)) return
    this._maps.delete(map)
    map.removeListener('add', this._addItem)
    map.removeListener('delete', this._deleteItem)
    map.keys().forEach(key => {
      let valueSet = this._map.get(key)
      if (!valueSet) {
        valueSet = new Set()
        this._map.set(key, valueSet)
      }
      const value = map.get(key)
      if (!valueSet.has(value)) {

      }
      this._map.set(key, set)
      this._map.set(key, map.get(key))
      this.emit('add', key, value)
    })
  }
}

module.exports = EventedMergedMap
