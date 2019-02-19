'use strict'
const { DHT } = require('dht-rpc')
const { PeersInput, PeersOutput } = require('@hyperswarm/dht/messages.js')
const ipv4Peers = require('ipv4-peers')
const filter = require('../lib/iter/filter.js')
const limit = require('../lib/iter/limit.js')

const ANNOUNCE_FLAG = Symbol('announce')
const UNANNOUNCE_FLAG = Symbol('unannounce')

function noop () {}

module.exports = {
  validate: (config) => true,
  create (config, emitter, peers) {
    let rpc
    return {
      open,
      lookup (key, cb) {
        handleStream(key, null, rpc.query('peers', Buffer.from(key, 'hex'), {}, err => {
          // TODO: What to do with an error?
          cb()
        }))
      },
      announce (key, address, cb) {
        queryAndUpdate(key, addressToPacket(address, ANNOUNCE_FLAG), cb)
      },
      unannounce (key, address, cb) {
        queryAndUpdate(key, addressToPacket(address, UNANNOUNCE_FLAG), cb)
      },
      close () {
        rpc.removeAllListeners()
        rpc.on('error', err => emitter.emit('close', err))
        rpc.on('close', () => emitter.emit('close'))
        rpc.destroy()
        rpc = null
      }
    }

    function open () {
      rpc = new DHT({
        bootstrap: config.bootstrap,
        ephemeral: false
      })
      rpc.on('close', onUnexpectedClose)
      rpc.on('error', onUnexpectedClose)
      rpc.on('warning', err => {
        emitter.emit('warning', err)
      })
      rpc.on('listening', data => {
        emitter.emit('listening')
      })
      rpc.command('peers', {
        inputEncoding: PeersInput,
        outputEncoding: PeersOutput,
        update: onpeers,
        query: onpeers
      })
    }

    function queryAndUpdate (key, packet, cb) {
      const host = hostForPackage(packet)
      handleStream(key, host, rpc.queryAndUpdate('peers', Buffer.from(key, 'hex'), packet, err => {
        // TODO: What to do with an error?
        cb()
      }))
    }

    function handleStream (key, host, stream) {
      stream
        .on('data', data => {
          const v = data.value
          if (!v || (!v.peers && !v.localPeers)) return
          const peer = {
            node: data.node,
            peers: v.peers && ipv4Peers.decode(v.peers),
            localPeers: host && v.localPeers && decodeLocalPeers(host, v.localPeers)
          }
          if (v.unannounce) {
            peers.deleteSimilar(key, peer)
          } else {
            peers.addSimilar(key, peer)
          }
        })
        .on('error', err => {
          // TODO: new Error('No nodes responded')
          // TODO: new Error('No close nodes responded')
        })
    }

    function onUnexpectedClose (err) {
      if (err !== null) {
        emitter.emit('warning', err)
      }
      rpc.removeAllListeners()
      rpc.on('error', noop)
      rpc = null
      emitter.emit('unlistening')
    }

    function onpeers (query, cb) {
      const value = query.value || {}
      const port = value.port || query.node.port
      if (!(port > 0 && port < 65536)) return cb(new Error('Invalid port'))

      const remoteRecord = ipv4Peers.encode([ { port, host: query.node.host } ])
      remoteRecord.port = port
      remoteRecord.host = query.node.host
      remoteRecord.hash = remoteRecord.toString('base64')
      const topic = query.target.toString('hex')
  
      if (query.type === DHT.QUERY) {
        const remote = Array.from(
          limit(
            128,
            filter(
              peers.get(topic),
              record => record.hash !== remoteRecord
            )
          )
        )
        // this.emit('lookup', query.target, remoteRecord)
  
        return cb(null, {
          peers: remote.length ? Buffer.concat(remote) : null,
          localPeers: null
          // TODO: implement local peers, this is going to be a pain, since the
          //       local network can change.
        })
      }

      if (value.unannounce) {
        peers.delete(topic, remoteRecord, remoteRecord.hash)
      } else {
        peers.add(topic, remoteRecord, remoteRecord.hash)
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
  const peers = []

  if (buf.length & 3) return null

  for (var i = 0; i < buf.length; i += 4) {
    const port = buf.readUInt16BE(i + 2)
    if (!port) return null
    peers.push({
      host: host + buf[i] + '.' + buf[i + 1],
      port
    })
  }

  return peers
}
