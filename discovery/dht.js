'use strict'
const { DHT } = require('dht-rpc')
const { PeersInput, PeersOutput } = require('@hyperswarm/dht/messages.js')
const ipv4Peers = require('ipv4-peers')
const createPeer = require('../lib/createPeer.js')
const collectPeers = require('../lib/collectPeers.js')

const ANNOUNCE_FLAG = Symbol('announce')
const UNANNOUNCE_FLAG = Symbol('unannounce')

function noop () {}

module.exports = {
  validate: (config) => true,
  create ({ bootstrap, port, addr }, emitter, peers) {
    let rpc
    return {
      open () {
        rpc = new DHT({
          bootstrap: bootstrap,
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
      },
      lookup (key, cb) {
        const keyBuffer = Buffer.from(key, 'hex')
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
            cb()
          }
        )
      },
      announce (key, address, cb) {
        queryAndUpdate(key, addressToPacket(address, ANNOUNCE_FLAG), cb)
      },
      unannounce (key, address, cb) {
        queryAndUpdate(key, addressToPacket(address, UNANNOUNCE_FLAG), cb)
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
      }
    }

    function queryAndUpdate (key, packet, cb) {
      const host = hostForPackage(packet)
      handleStream(
        key,
        host,
        rpc.queryAndUpdate('peers', Buffer.from(key, 'hex'), packet),
        err => {
          if (err) {
            emitter.emit('warning', Object.assign(new Error('Error during query'), {
              code: 'EDHTQUERY',
              key,
              packet,
              cause: err
            }))
          }
          cb()
        }
      )
    }

    function handleStream (key, host, stream, cb) {
      stream
        .on('data', data => {
          const v = data.value
          if (!v || (!v.peers && !v.localPeers)) return
          if (v.peers) {
            const simplePeers = ipv4Peers.decode(v.peers)
            for (const simplePeer of simplePeers) {
              const peer = createPeer(simplePeer.port, simplePeer.host)
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

      const remoteRecord = createPeer(port, query.node.host)
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
    localAddress: address.localAddress && ipv4Peers.encode([address.localAddress])
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
