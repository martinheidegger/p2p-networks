'use strict'
const Discovery = require('./Discovery.js')
const ConfigSet = require('./ConfigSet.js')

class DiscoverySet extends ConfigSet {

  constructor (keyAddressSet) {
    super(config => {
      const discovery = new Discovery(config, keyAddressSet)
      discovery.on('peer', (key, peerAddress) => this.emit('peer', key, peerAddress))
      return {
        close: function (cb) {
          discovery.close((err) => {
            if (err) return cb(err)
            discovery.removeAllListeners()
            return cb()
          })
        }
      }
    })
  }
}

module.exports = DiscoverySet
