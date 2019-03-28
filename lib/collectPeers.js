'use strict'
const filter = require('../lib/iter/filter.js')
const limit = require('../lib/iter/limit.js')
const toBuffer = require('../lib/iter/toBuffer.js')
const map = require('../lib/iter/map.js')

module.exports = function collectPeers (topic, remoteRecordAsString, peers) {
  return {
    peers: toBuffer(
      map(peer => peer.asBytes,
      limit(
        128,
        filter(
          record => record.asString !== remoteRecordAsString,
          peers.get(topic)
        )
      ))
    ),
    // TODO: implement local peers, this is going to be a pain, since the
    //       local network can change.
    // localPeers: null
  }
}
