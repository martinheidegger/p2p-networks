'use strict'
const EventEmitter = require('events').EventEmitter

class EventedSet extends EventEmitter {
  constructor () {
    super()
    this._set = new Set()
  }

  add (entry) {
    if (this._set.has(entry)) {
      return
    }
    this._set.add(entry)
    this.emit('add', entry)
  }

  delete (entry) {
    if (!this._set.has(entry)) {
      return
    }
    this._set.delete(entry)
    this.emit('delete', entry)
  }

  clear () {
    // Todo: to implement this we need to be aware
    //       that within the "delete" event-loop hook, 
    //       further add/delete operations can be triggered
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
