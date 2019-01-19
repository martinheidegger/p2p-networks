'use strict'
const EventEmitter = require('events').EventEmitter
const createLockCb = require('flexlock-cb').createLockCb
const mapEach = require('map-each').mapEach
const objectHash = require('object-hash')

function configHash (config) {
  return objectHash(config, {
    encoding: 'base64',
    respectType: false,
    unorderedArray: false,
    unorderedSets: true,
    unorderedObject: true,
  })
}

class ConfigSet extends EventEmitter {
  constructor (createInstance) {
    super()
    this._createInstance = createInstance
    this._lock = createLockCb()
    this._instances = new Map()
    this._closed = false
  }

  update (iterable) {
    if (this._closed) return
    let added = []
    let removed = new Set(this._instances.keys())
    const iter = iterable[Symbol.iterator]()
    let next
    while ((next = iter.next()) && !next.done) {
      const config = next.value
      const hash = configHash(config)
      if (removed.has(hash)) {
        removed.delete(hash)
      } else {
        added.push({
          hash, config
        })
      }
    }
    this._lock(unlock => {
      mapEach(removed, (hash, cb) => {
        if (this._closed) return cb()
        this._remove(hash, cb)
      }, 1, err => {
        if (this._closed) return unlock()
        if (err) {
          return unlock(err)
        }
        mapEach(added, (entry, cb) => this._add(entry.config, entry.hash, cb), 1, unlock)
      })
    }, 0, err => { /* TODO: HANDLE ERROR */ })
  }

  clear (cb) {
    return this._lock(unlock => {
      mapEach(this._instances.entries(), (tuple, cb) => {
        if (this._closed) return cb()
        const hash = tuple[0]
        const instance = tuple[1]
        instance.close(err => {
          if (err) {
            return cb(err)
          }
          this._instances.delete(hash)
          unlock()
        })
      }, unlock)
    }, cb)
  }

  _add (config, hash, cb) {
    return this._lock(unlock => {
      let instance = this._instances.get(hash)
      if (instance) {
        return unlock(null, false)
      }
      try {
        instance = this._createInstance(config)
      } catch (err) {
        // TODO: log that error
        return unlock(null, false)
      }
      this._instances.set(hash, instance)
      unlock(null, true)
    }, cb)
  }

  _remove (hash, cb) {
    return this._lock(unlock => {
      if (this._closed || !this._instances.has(hash)) {
        return unlock(null, false)
      }
      const instance = this._instances.get(hash)
      instance.close(err => {
        if (err) return unlock(err)
        this._instances.delete(hash)
        unlock(null, true)
      })
    }, cb)
  }

  close (cb) {
    this.clear(err => {
      this._closed = true
      cb(err)
    })
  }

  add (config, cb) {
    return this._add(config, configHash(config), cb)
  }

  remove (config, cb) {
    return this._remove(configHash(config), cb)
  }
}

module.exports = ConfigSet
