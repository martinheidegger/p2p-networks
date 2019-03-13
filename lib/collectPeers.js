'use strict'
const filter = require('../lib/iter/filter.js')
const limit = require('../lib/iter/limit.js')
const combineTwo = require('../lib/iter/combineTwo.js')
const toBuffer = require('../lib/iter/toBuffer.js')

module.exports = function collectPeers (topic, remoteRecordAsString, peers, keyByAddress) {
  return {
    peers: toBuffer(
      limit(
        128,
        combineTwo(
          keyByAddress.keys.has(topic) ? keyByAddress.values() : undefined,
          filter(
            record => record.asString !== remoteRecordAsString,
            peers.get(topic)
          )
        )
      )
    ),
    localPeers: null
    // TODO: implement local peers, this is going to be a pain, since the
    //       local network can change.
  }
}
