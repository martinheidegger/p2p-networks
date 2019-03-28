'use strict'
const { DHT } = require('dht-rpc')
const { PeersInput, PeersOutput } = require('@hyperswarm/dht/messages.js')
const Peer = require('../lib/Peer.js')
const collectPeers = require('../lib/collectPeers.js')

const ANNOUNCE_FLAG = Symbol('announce')
const UNANNOUNCE_FLAG = Symbol('unannounce')

function noop () {}

module.exports = {
  validate: (config) => true,
  create ({ bootstrap, port, addr }, emitter, peers) {
    let rpc
    let holepunch = noop
    return {
      open () {
        rpc = new DHT({
          bootstrap,
          ephemeral: false
        })
        rpc.on('close', onUnexpectedClose)
        rpc.on('error', onUnexpectedClose)
        rpc.on('warning', emitter.emit.bind(emitter, 'warning'))
        rpc.on('listening', emitter.emit.bind(emitter, 'listening'))
        rpc.command('peers', {
          inputEncoding: PeersInput,
          outputEncoding: PeersOutput,
          update: peersQueryHandler,
          query: peersQueryHandler
        })
        rpc.listen(port, addr)
        holepunch = (peer, cb) => rpc.holepunch(peer, cb)
      },
      toggleSearch (key, isSearching, cb) {
        const keyBuffer = Buffer.from(key, 'hex')
        if (isSearching) {
          handleStream(
            key,
            null,
            rpc.query('peers', keyBuffer, {}),
            err => {
              if (err) {
                emitter.emit('warning', Object.assign(new Error('Error during query'), {
                  code: 'EDHTLOOKUP',
                  key,
                  cause: err
                }))
              }
              cb(null)
            }
          )
        } else {
          // TODO: !
        }
      },
      toggleAnnounce (key, address, isAnnouncing, cb) {
        if (address.type !== 'IPv4' || address.mode !== Peer.MODE.tcpOrUdp) {
          return cb(new Error('Only IPv4 and tcpOrUdp supported'))
        }
        update(key, addressToPacket(address, isAnnouncing ? ANNOUNCE_FLAG : UNANNOUNCE_FLAG), cb)
      },
      close () {
        rpc.removeAllListeners()
        rpc.on('error', err => {
          emitter.emit('warning', Object.assign(new Error('Error while closing'), {
            code: 'EDHTCLOSE',
            cause: err
          }))
          emitter.emit('close')
        })
        rpc.on('close', () => emitter.emit('close'))
        rpc.destroy()
        rpc = null
        holepunch = noop
      }
    }

    function update (key, packet, cb) {
      const host = hostForPackage(packet)
      handleStream(
        key,
        host,
        rpc.update('peers', Buffer.from(key, 'hex'), packet),
        err => {
          if (err) {
            emitter.emit('warning', Object.assign(new Error('Error during query'), {
              code: 'EDHTQUERY',
              key,
              packet,
              cause: err
            }))
          }
          cb(null)
        }
      )
    }

    function handleStream (key, host, stream, cb) {
      stream
        .on('data', data => {
          const v = data.value
          if (!v || (!v.peers && !v.localPeers)) return
          if (v.peers) {
            const foundPeers = Peer.decodeAll(v.peers, {
              referrer: data.node,
              holepunch
            })
            for (const peer of foundPeers) {
              if (v.unannounce) {
                peers.delete(key, peer, peer.asString)
              } else {
                peers.add(key, peer, peer.asString)
              }
            }
          }
        })
        .on('error', err => {
          stream.removeListener('end', cb || noop)
          cb(err)
        })
        .on('end', cb)
    }

    function onUnexpectedClose (err) {
      emitter.emit('warning', Object.assign(new Error('DHT unexpectedly closed.'), {
        code: 'EDHTCLOSED',
        cause: err
      }))
      rpc.removeAllListeners()
      rpc.on('error', noop)
      rpc = null
      emitter.emit('unlistening')
    }

    function peersQueryHandler (query, cb) {
      const value = query.value || {}
      const port = value.port || query.node.port
      if (!(port > 0 && port < 65536)) return cb(new Error('Invalid port'))

      const remoteRecord = Peer.create(port, query.node.host)
      const topic = query.target.toString('hex')

      if (query.type === DHT.QUERY) {
        const res = collectPeers(topic, remoteRecord.asString, peers)
        return cb(null, res)
      }

      if (query.type === DHT.UPDATE) {
        if (value.unannounce) {
          peers.delete(topic, remoteRecord, remoteRecord.asString)
        } else {
          peers.add(topic, remoteRecord, remoteRecord.asString)
        }
        return cb(null, null)
      }
      cb(null, null)
    }
  }
}

function addressToPacket (address, announce) {
  const packet = {
    port: address.port,
    localAddress: null, // address.localAddress && ipv4Peers.encode([address.localAddress])
  }
  if (announce === UNANNOUNCE_FLAG) {
    packet.unannounce = true
  }
  return packet
}

function hostForPackage (pkg) {
  if (!pkg.localAddress) {
    return null
  }
  const prefix = pkg.localAddress
  return prefix[0] + '.' + prefix[1] + '.'
}

function decodeLocalPeers (host, buf) {
  const localPeers = []

  if (buf.length & 3) return null

  for (var i = 0; i < buf.length; i += 4) {
    const port = buf.readUInt16BE(i + 2)
    if (!port) return null
    localPeers.push({
      host: host + buf[i] + '.' + buf[i + 1],
      port
    })
  }

  return localPeers
}
