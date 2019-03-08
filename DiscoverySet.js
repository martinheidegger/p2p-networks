'use strict'
const Discovery = require('./Discovery.js')
const ConfigSet = require('./ConfigSet.js')
const EventedMergedMap = require('./lib/EventedMergedMap.js')

class DiscoverySet extends ConfigSet {

  constructor (services, keyByAddress) {
    super((config, cb) => {
      let discovery
      try {
        discovery = new Discovery(services, config, keyByAddress)
      } catch (err) {
        return cb(err)
      }
      cb(null, {
        close: cb => {
          this._peers.delete(discovery.peers)
          discovery.close((err) => {
            if (err) return cb(err)
            discovery.removeAllListeners()
            return cb()
          })
        }
      })
    })

    this._peers = new EventedMergedMap()
  }

  get peers () {
    return this._peers
  }
}

module.exports = DiscoverySet
