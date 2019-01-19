'use strict'
const { DHT } = require('dht-rpc')
const { PeersInput, PeersOutput } = require('@hyperswarm/dht/messages.js')
const ipv4Peers = require('ipv4-peers')
const filter = require('../lib/iter/filter.js')

const ANNOUNCE_FLAG = Symbol('announce')
const UNANNOUNCE_FLAG = Symbol('unannounce')

exports = {
  validate: (config) => true,
  create: (config, emitter, peers) => {
    let rpc
    return {
      open: function () {
        if (rpc) throw new Error('dht should have been nonexistent')
        rpc = new DHT({
          bootstrap: config.bootstrap,
          ephemeral: false
        })
        rpc.on('close', onUnexpectedClose)
        rpc.on('listening', emitter.emit.bind(emitter, 'listening'))
        rpc.command('peers', {
          inputEncoding: PeersInput,
          outputEncoding: PeersOutput,
          update: onpeers,
          query: onpeers
        })
      },
      lookup: function (key) {
        handleStream(key, null, rpc.query('peers', key, err => {
          // TODO: What to do with an error?
        }))
      },
      announce: function (key, address) {
        queryAndUpdate(key, addressToPacket(address, ANNOUNCE_FLAG))
      },
      unannounce: function (key, address) {
        queryAndUpdate(key, addressToPacket(address, UNANNOUNCE_FLAG))
      },
      close: function (cb) {
        // Unless an error is passed to cb, will be called only once by Discovery
        rpc.removeListener('close', onUnexpectedClose)
        rpc.close(cb)
        rpc = null
      }
    }

    function queryAndUpdate (key, packet) {
      const host = hostForPackage(packet)
      handleStream(key, host, rpc.queryAndUpdate('peers', key, packet, err => {
        // TODO: What to do with an error?
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

    function onUnexpectedClose () {
      emitter.emit('unlistening')
    }

    function onpeers (query, cb) {
      const value = query.value || {}
      const from = {
        port: value.port || query.node.port,
        host: query.node.host
      }

      if (!(from.port > 0 && from.port < 65536)) return cb(new Error('Invalid port'))

      const remoteRecord = ipv4Peers.encode([ from ])
      const topic = query.target.toString('hex')
  
      if (query.type === DHT.QUERY) {
        const remote = filter(peers.getLimited(topic, 128), remoteRecord)
        this.emit('lookup', query.target, from)
  
        return cb(null, {
          peers: remote.length ? Buffer.concat(remote) : null,
          localPeers: null // TODO: implement local peers, this is going to be a pain...
        })
      }

      if (value.unannounce) {
        peers.delete(query.target, from)
      } else {
        peers.add(query.target, from)
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
