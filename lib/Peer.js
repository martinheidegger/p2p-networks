'use strict'
const ipv4Peers = require('ipv4-peers')

const MODE = {
  tcpOrUdp: 0,
  tcp: 1,
  udp: 2,
  tcpNoise: 3,
  udpNoise: 4
}
const MODE_BY_VALUE = Object.keys(MODE).reduce((mapped, key) => {
  mapped[MODE[key]] = key
  return mapped
}, {})

function create (port, host, { type = 'IPv4', mode = MODE.tcpOrUdp, holepunch = null, referrer = null } = {}) {
  if (type !== 'IPv4') {
    throw new Error(`Type ${type} not implemented`)
  }
  if (typeof port === 'string') {
    port = parseInt(port, 10)
  }
  if (!MODE_BY_VALUE[mode]) {
    throw new Error(`Unsupported mode: ${mode}`)
  }
  if (!host) {
    host = '0.0.0.0'
  }
  const asBytes = ipv4Peers.encode([ { port, host } ])
  return {
    asString: `${type}|${mode}|${asBytes.toString('base64')}`,
    asBytes,
    host, port,
    type, mode,
    holepunch,
    referrer
  }
}

function * decodeAll (buffer, opts) {
  const simplePeers = ipv4Peers.decode(buffer)
  for (const simplePeer of simplePeers) {
    yield create(simplePeer.port, simplePeer.host, opts)
  }
}

module.exports = {
  create,
  decodeAll,
  MODE
}