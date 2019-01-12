'use strict'
const EventEmitter = require('events').EventEmitter

class EventedSet extends EventEmitter {
  constructor () {
    super()
    this._set = new Set()
  }

  add (entry) {
    if (this._set.has(entry)) {
      return this
    }
    this._set.add(entry)
    this.emit('add', entry)
    return this
  }

  delete (entry) {
    if (!this._set.has(entry)) {
      return this
    }
    this._set.delete(entry)
    this.emit('delete', entry)
    return this
  }

  clear () {
    throw new Error('Difficult to correctly implement.')
  }

  [Symbol.iterator]() {
    return this._set[Symbol.iterator]()
  }

  forEach (fn) {
    return this._set.forEach(fn)
  }

  has (entry) {
    return this._set.has(entry)
  }

  get size () {
    return this._set.size
  }

  keys () {
    return this._set.keys()
  }

  entries () {
    return this._set.entries()
  }

  values () {
    return this._set.values()
  }
}

module.exports = EventedSet
