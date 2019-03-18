'use strict'
const discoveryTest = require('./_common.js')
const dht = require('../../discovery/dht-legacy.js')
const createDht = require('bittorrent-dht')

const node = createDht({
  bootstrap: false
})
discoveryTest({
  name: 'dht-legacy',
  errorPrefix: 'DHTLEGACY',
  setup (cb) {
    node.listen(0, () => {
      const addr = node.address()
      cb(null, `${addr.address}:${addr.port}`)
    })
  },
  instantiate (opts, event, peers) {
    return dht.create(opts, event, peers)
  },

  tearDown (cb) {
    node.destroy()
    cb()
  }
})
