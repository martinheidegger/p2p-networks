'use strict'
const EventEmitter = require('events').EventEmitter

const DONE = {
  done: true,
  value: null
}

class Evented2DMatrix extends EventEmitter {
  constructor (x, y) {
    super()
    x.on('add', xValue => {
      for (const yValue of y) {
        this.emit('add', xValue, yValue)
      }
    })
    x.on('remove', xValue => {
      for (const yValue of y) {
        this.emit('remove', xValue, yValue)
      }
    })
    y.on('add', yValue => {
      for (const aValue of x) {
        this.emit('add', aValue, yValue)
      }
    })
    y.on('remove', yValue => {
      for (const aValue of x) {
        this.emit('remove', aValue, yValue)
      }
    })
    this._x = x
    this._y = y
  }

  x () {
    return this._y
  }

  y () {
   return this._y
  }

  entries () {
    const xIter = this._x[Symbol.iterator]()
    if (this._x.size === 0 || this._y.size === 0) {
      return DONE
    }
    let xState = xIter.next()
    let yIter = null
    return {
      next: function() {
        if (xState.done) {
          return DONE
        }
        if (yIter === null) {
          yIter = this._y[Symbol.iterator]()
        }
        let yState = yIter.next()
        if (yState.done) {
          xState = xIter.next()
          if (xState.done) {
            return DONE
          }
          yIter = this._y[Symbol.iterator]()
          yState = yIter.next()
        }
        return {
          done: false,
          value: [xState.value, yState.value]
        }
      }
    }
  }
}

module.exports = Evented2DMatrix
