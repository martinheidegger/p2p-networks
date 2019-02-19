'use strict'
const ipv4Peers = require('ipv4-peers')
module.exports = function createPeer (port, host) {
  const remoteRecord = ipv4Peers.encode([ { port, host } ])
  remoteRecord.port = port
  remoteRecord.host = host
  remoteRecord.asString = remoteRecord.toString('base64')
  return remoteRecord
}
