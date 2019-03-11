'use strict'
const EventEmitter = require('events').EventEmitter
const createLockCb = require('flexlock-cb').createLockCb
const mapEach = require('map-each').mapEach
const configHash = require('./lib/configHash.js')

function chain (args, op, next) {
  if (op.length > args.length) {
    return new Promise((resolve, reject) => {
      args[args.length] = (err, data) => {
        if (err) return reject(err)
        resolve(data)
      }
      args.length += 1
      chain(args, op, next)
    })
  }
  const cb = args[args.length - 1]
  args[args.length - 1] = function (err, data) {
    if (err) return cb(err)
    next(data, cb)
  }
  op.apply(null, args)
}

class ConfigSet extends EventEmitter {
  constructor (createInstance) {
    super()
    this._createInstance = createInstance
    this._lock = createLockCb()
    this._instances = new Map()
    this._closed = false
  }

  update (iterable, cb) {
    return this._lock(unlock => {
      if (this._closed) return unlock(null, false)
      const added = []
      const deleted = new Set(this._instances.keys())
      for (const config of iterable) {
        const hash = configHash(config)
        if (deleted.has(hash)) {
          deleted.delete(hash)
        } else {
          added.push({ hash, config })
        }
      }
      mapEach(
        // TODO: parallel closing?
        deleted,
        (hash, cb) => this._delete(hash, cb),
        err => {
          if (err) return unlock(err)
          mapEach(
            added,
            (entry, cb) => this._add(entry.config, entry.hash, cb),
            unlock
          )
        }
      )
    }, cb)
  }

  clear (clearCb) {
    return this._lock(unlock => mapEach(
      this._instances.keys(),
      (hash, cb) => this._delete(hash, cb),
      unlock
    ), clearCb)
  }

  _add (config, hash, cb) {
    const entry = this._instances.get(hash)
    if (entry) {
      return cb(null, false)
    }
    this._createInstance(config, (err, instance) => {
      if (err) {
        this.emit('warning', Object.assign(new Error('Couldnt create config instance.'), { config, hash, cause: err, source: this }))
        return cb(null, false)
      }
      this._instances.set(hash, { instance, config })
      this.emit('add', instance, config, hash)
      cb(null, true)
    })
  }

  _delete (hash, cb) {
    const entry = this._instances.get(hash)
    if (!entry) {
      return cb(null, false)
    }
    entry.instance.close(err => {
      if (err) {
        this.emit('warning', Object.assign(new Error('Error while closing instance.'), { config: entry.config, hash, cause: err, source: this }))
      }
      this._instances.delete(hash)
      this.emit('delete', entry.instance, entry.config, hash)
      cb(null, true)
    })
  }

  close (_) {
    return chain(arguments, cb => this.clear(cb), (_, cb) => {
      this._closed = true
      cb()
    })
  }

  add (config, cb) {
    return this._lock(unlock => {
      if (this._closed) return unlock(null, false)
      this._add(config, configHash(config), unlock)
    }, cb)
  }

  delete (config, cb) {
    return this._lock(unlock => {
      if (this._closed) return unlock(null, false)
      this._delete(configHash(config), unlock)
    }, cb)
  }
}

module.exports = ConfigSet
