'use strict'
const EventEmitter = require('events').EventEmitter

class EventedSetOfSets extends EventEmitter {
  constructor () {
    super()
    this._sets = new Set()
  }
  add (set) {
    if (this._sets.has(set)) {
      return
    }
    this._sets.add(set)
    set.on('add', entry => this.emit('add', entry))
    set.on('delete', entry => this.emit('delete', entry))
    set.forEach(entry => this.emit('add', entry))
  }

  delete (set) {
    if (!this._sets.has(set)) {
      return
    }
    this._sets.delete(set)
    set.removeAllListeners()
    set.forEach(entry => this.emit('delete', entry))
  }
}

module.exports = EventedSetOfSets
