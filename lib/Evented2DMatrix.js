'use strict'
const EventEmitter = require('events').EventEmitter
const { createLockCb } = require('flexlock-cb')

class Evented2DMatrix extends EventEmitter {
  constructor (keys, values) {
    super()
    const lock = createLockCb(null, err => this.emit('error', err))
    // Maintaing a in-sync stack
    let _values = new Set()
    let _keys = new Set()
    keys.on('change', lock.syncWrap((key, add) => {
      if (add) {
        _keys.add(key)
      } else {
        _keys.delete(key)
      }
      this.emit('key', key, add)
      for (const value of _values) {
        this.emit('change', key, value, add)
      }
    }))
    values.on('change', lock.syncWrap((value, add) => {
      if (add) {
        _values.add(value)
      } else {
        _values.delete(value)
      }
      this.emit('value', value, add)
      for (const key of _keys) {
        this.emit('change', key, value, add)
      }
    }))
    this._keys = _keys
    this._values = _values
  }

  size () {
    return this._keys.size * this._values.size
  }

  get (topic) {
    if (this._keys.has(topic)) {
      return this._values
    }
  }
  
  has (topic) {
    return this._values.size > 0 && this._keys.has(topic)
  }

  get keys() {
    return this._keys
  }

  get values () {
    return this._values
  }

  * [Symbol.iterator] () {
    if (this._keys.size === 0) {
      return
    }
    for (const key of this._keys) {
      for (const value of this._values) {
        yield { key, value }
      }
    }
  }
}

module.exports = Evented2DMatrix
