'use strict'
const tape = require('tape')
const ipv4Peers = require('ipv4-peers')
const createPeer = require('../../lib/createPeer')

tape('createPeer > basic', t => {
  const peer = createPeer(8080, '127.0.0.1')
  t.equals(peer.port, 8080)
  t.equals(peer.host, '127.0.0.1')
  const copy = Buffer.concat([peer])
  t.deepEquals(ipv4Peers.decode(copy), [{
    port: 8080,
    host: '127.0.0.1'
  }])
  t.equals(peer.asString, 'fwAAAR+Q')
  t.end()
})
