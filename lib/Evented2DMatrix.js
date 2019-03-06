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
    keys.on('add', lock.syncWrap(key => {
      _keys.add(key)
      for (const value of _values) {
        this.emit('add', key, value)
      }
    }))
    keys.on('delete', lock.syncWrap(key => {
      _keys.delete(key)
      for (const value of _values) {
        this.emit('remove', key, value)
      }
    }))
    values.on('add', lock.syncWrap(value => {
      _values.add(value)
      for (const key of _keys) {
        this.emit('add', key, value)
      }
    }))
    values.on('delete', lock.syncWrap(value => {
      _values.delete(value)
      for (const key of _keys) {
        this.emit('remove', key, value)
      }
    }))
    this._keys = _keys
    this._values = _values
  }

  size () {
    return this._keys.size * this._values.size
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
