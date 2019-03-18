'use strict'
const tape = require('tape-x')()
const ipv4Peers = require('ipv4-peers')
const createPeer = require('../../lib/createPeer')

tape('basic', t => {
  const peer = createPeer(8080, '127.0.0.1')
  t.equals(peer.port, 8080)
  t.equals(peer.host, '127.0.0.1')
  const copy = Buffer.concat([peer])
  t.equals(Buffer.isBuffer(peer), true)
  t.equals(Buffer.byteLength(peer), 6)
  t.deepEquals(ipv4Peers.decode(copy), [{
    port: 8080,
    host: '127.0.0.1'
  }])
  t.equals(peer.asString, 'fwAAAR+Q')
  t.end()
})
