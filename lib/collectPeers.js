'use strict'
const filter = require('../lib/iter/filter.js')
const limit = require('../lib/iter/limit.js')
const toBuffer = require('../lib/iter/toBuffer.js')

module.exports = function collectPeers (topic, remoteRecordAsString, peers) {
  return {
    peers: toBuffer(
      limit(
        128,
        filter(
          record => record.asString !== remoteRecordAsString,
          peers.get(topic)
        )
      )
    ),
    // TODO: implement local peers, this is going to be a pain, since the
    //       local network can change.
    // localPeers: null
  }
}
