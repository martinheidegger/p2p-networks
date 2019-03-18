'use strict'
const Discovery = require('./Discovery.js')
const ConfigSet = require('./ConfigSet.js')

class DiscoverySet extends ConfigSet {

  constructor (services, peers, keyByAddress) {
    super((config, cb) => {
      let discovery
      try {
        discovery = new Discovery(services, config, peers, keyByAddress)
      } catch (err) {
        return cb(err)
      }
      cb(null, {
        close: cb => {
          discovery.close((err) => {
            if (err) return cb(err)
            discovery.removeAllListeners()
            return cb()
          })
        }
      })
    })
  }
}

module.exports = DiscoverySet
