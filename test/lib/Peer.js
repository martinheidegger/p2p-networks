'use strict'
const tape = require('tape-x')()
const ipv4Peers = require('ipv4-peers')
const Peer = require('../../lib/Peer.js')

tape('basic', t => {
  const peer = Peer.create(8080, '192.168.11.11', {
    type: 'IPv4',
    mode: Peer.MODE.udp
  })
  t.equals(peer.type, 'IPv4')
  t.equals(peer.mode, Peer.MODE.udp)
  t.equals(peer.port, 8080)
  t.equals(peer.host, '192.168.11.11')
  const copy = Buffer.concat([peer.asBytes])
  t.equals(Buffer.isBuffer(peer.asByes), true)
  t.equals(Buffer.byteLength(peer.asBytes), 6)
  t.deepEquals(ipv4Peers.decode(copy), [{
    port: 8080,
    host: '192.168.11.11'
  }])
  t.equals(peer.asString, 'IPv4|0|fwAAAR+Q')
  t.end()
})

tape('optionals', t => {

})
