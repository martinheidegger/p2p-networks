'use strict'
const EventEmitter = require('events').EventEmitter

const DONE = {
  done: true,
  value: null
}

class Evented2DMatrix extends EventEmitter {
  constructor (a, b) {
    super()
    a.on('add', aValue => {
      for (const bValue of b) {
        this.emit('add', aValue, bValue)
      }
    })
    a.on('remove', aValue => {
      for (const bValue of b) {
        this.emit('remove', aValue, bValue)
      }
    })
    b.on('add', bValue => {
      for (const aValue of a) {
        this.emit('add', aValue, bValue)
      }
    })
    b.on('remove', bValue => {
      for (const aValue of a) {
        this.emit('remove', aValue, bValue)
      }
    })
    this._a = a
    this._b = b
  }

  entries () {
    const aIter = this._a[Symbol.iterator]()
    if (this._a.size === 0 || this._b.size === 0) {
      return DONE
    }
    let aState = aIter.next()
    let bIter = null
    return {
      next: function() {
        if (aState.done) {
          return DONE
        }
        if (bIter === null) {
          bIter = this._b[Symbol.iterator]()
        }
        let bState = bIter.next()
        if (bState.done) {
          aState = aIter.next()
          if (aState.done) {
            return DONE
          }
          bIter = this._b[Symbol.iterator]()
          bState = bIter.next()
        }
        return {
          done: false,
          value: [aState.value, bState.value]
        }
      }
    }
  }
}

module.exports = Evented2DMatrix
