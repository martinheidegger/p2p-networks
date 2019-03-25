'use strict'
const EventEmitter = require('events').EventEmitter

class EventedSetOfSets extends EventEmitter {
  constructor () {
    super()
    this._count = new Map()
    this._sets = new Set()
    this._add = entry => {
      const count = this._count.get(entry)
      if (count === undefined) {
        this._count.set(entry, 1)
        this.emit('change', entry, true)
      } else {
        this._count.set(entry, count + 1)
      }
    }
    this._delete = entry => {
      const count = this._count.get(entry)
      if (count === 1) {
        this._count.delete(entry)
        this.emit('change', entry, false)
      } else {
        this._count.set(entry, count - 1)
      }
    }
  }
  add (set) {
    if (this._sets.has(set)) {
      return
    }
    this._sets.add(set)
    set.on('change', (entry, isAdd) => isAdd ? this._add(entry) : this._delete(entry))
    set.forEach(this._add)
  }

  has (entry) {
    return this._count.has(entry)
  }

  get size () {
    return this._count.size
  }

  delete (set) {
    if (!this._sets.has(set)) {
      return
    }
    this._sets.delete(set)
    set.removeAllListeners()
    set.forEach(this._delete)
  }
}

module.exports = EventedSetOfSets
