'use strict'
const EventEmitter = require('events').EventEmitter
const DONE = { done: true }
const RETURN_DONE = function () { return DONE }
const EMPTY_ITERATOR = {
  next: RETURN_DONE
}
class EventedMapOfSets extends EventEmitter {
  constructor () {
    super()
    this._map = new Map()
    this._addItem = () => {
    }
    this._updateItem = () => {
    }
    this._deleteItem = () => {
    }
  }

  has (key, value) {
    const valueSet = this._map.get(key)
    if (!valueSet) return false

    return valueSet.has(value)
  }

  add (key, value) {
    let valueSet = this._map.get(key)
    if (valueSet.has(value)) return

    valueSet.add(value)
    this.emit('add', key, value)
  }

  getLimited (key, limit) {
    const valueSet = this._map.get(key)
    if (!valueSet || limit < 1) return EMPTY_ITERATOR
    const iter = valueSet.entries()[Symbol.iterator]()
    return {
      next () {
        if (limit === 0) return DONE
        const value = iter.next()
        if (value.done) {
          limit = 0
        } else {
          limit -= 1
        }
        return value
      }
    }
  }

  delete (key, value) {
    const valueSet = this._map.get(key)
    if (valueSet === undefined) return
    if (!valueSet.has(value)) return

    valueSet.delete(value)
    if (valueSet.size === 0) {
      this._map.delete(key)
    }
    this.emit('delete', key, value)
  }
}

module.exports = EventedMapOfSets
