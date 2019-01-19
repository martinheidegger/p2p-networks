'use strict'
const Discovery = require('./Discovery.js')
const ConfigSet = require('./ConfigSet.js')
const EventedMergedMap = require('./lib/EventedMergedMap.js')

class DiscoverySet extends ConfigSet {

  constructor (keyByAddress) {
    super(config => {
      const discovery = new Discovery(config, keyByAddress)
      this._peers.add(discovery.peers)
      return {
        close: cb => {
          this._peers.delete(discovery.peers)
          discovery.close((err) => {
            if (err) return cb(err)
            discovery.removeAllListeners()
            return cb()
          })
        }
      }
    })

    this._peers = new EventedMergedMap()
  }

  get peers () {
    return this._peers
  }
}

module.exports = DiscoverySet
