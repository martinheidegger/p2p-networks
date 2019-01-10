'use strict'
const Discovery = require('./Discovery.js')
const ConfigSet = require('./ConfigSet.js')
const listenerChange = require('./lib/listenerChange.js')

class DiscoverySet extends ConfigSet {

  constructor (discoveryList) {
    super(opts => {
      const discovery = new Discovery(opts)
      discovery.on('peer-add', (key, address) => this.emit('listen', key, address))
      discovery.on('peer-remove', (key, address) => this.emit('unlisten', key, address))

      this._announced.
      return {
        announce: discovery.announce,
        unannounce: discovery.unannounce,
        close: function (cb) {
          discovery.close((err) => {
            if (err) return cb(err)
            discovery.removeAllListeners()
            return cb()
          })
        }
      }
    })

    this.announce = this.announce.bind(this)
    this.unannounce = this.unannounce.bind(this)
  }

  announce (key) {
    this._keys[key] = true
    this._discoveries.forEach(discovery => discovery.announce(key))
  }

  unannounce (key) {
    delete this._keys[key]
    this._discoveries.forEach(discovery => discovery.unannounce(key))
  }

  add (opts, cb) {
    return this._lock(unlock => {
      // Locking the creation, because the deletion of a former
      // discovery could still be blocking a port!
      const discovery = new Discovery(opts)
      for (const key in this._keys) {
        discovery.announce(key)
      }
      this._discoveries.push(discovery)
      unlock()
    }, cb)
  }

  remove (opts, cb) {
    return this._lock(unlock => {
      for (let i = 0; i < this._discoveries.length; i++) {
        const discovery = this._discoveries[i]
        if (deepEqual(discovery.opts, opts)) {
          this._discoveries.splice(i, 1)
          discovery.close(err => {
            if (err) return unlock(err)
            unlock(null, true)
          })
          return
        }
      }
      unlock(null, false)
    }, cb)
  }

  destroy (cb) {
    return mapEach(this._discoveries, (discovery, done) => discovery.destroy(done), cb)
  }
}

module.exports = DiscoverySet
