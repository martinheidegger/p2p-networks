'use strict'
const createDht = require('bittorrent-dht')
const Peer = require('../lib/Peer.js')
const noop = () => {}
const { createLockCb } = require('flexlock-cb')

module.exports = {
  verify: () => true,
  create ({ bootstrap, port, address, name }, emitter, peers) {
    let dht
    let lock
    return {
      open () {
        dht = createDht({
          maxAge: 1000,
          maxPeers: 10000,
          maxTables: 1000,
          maxValues: 1000,
          timeout: 2000,
          k: 20,
          concurrency: 16,
          backgroundConcurrency: 4,
          bootstrap
        })
        // dht.on('announce-peer', onAnnouncePeer)
        dht.on('peer', onPeer)
        // dht.on('node', onNode)
        dht.on('close', onUnexpectedClose)
        dht.on('error', onUnexpectedClose)
        dht.on('warn', emitter.emit.bind(emitter, 'warning'))
        lock = createLockCb()
        lock(unlock => dht.on('ready', unlock), noop)
        dht.on('listening', () => lock.sync(() => emitter.emit('listening', )))
        dht.listen({
          port,
          address
        })
      },
      toggleSearch (key, isSearching, cb) {
        if (!isSearching) {
          // TODO: !
          return cb()
        }
        lock(unlock =>
          dht.lookup(key, err => {
            if (err) {
              emitter.emit('warning', Object.assign(new Error('Lookup didnt work'), {
                code: 'EDHTLEGACYLOOKUP',
                cause: err
              }))
            }
            unlock()
          })
        , cb)
      },
      toggleAnnounce (key, address, isAnnouncing, cb) {
        lock(unlock => {
          if (address.type !== 'IPv4' || address.mode !== Peer.MODE.tcpOrUdp) {
            return unlock(new Error('Only IPv4 and tcpOrUdp supported'))
          }
          // TODO: announce only hosts that are non-local?
          if (isAnnouncing) {
            dht.announce(key, address.port, err => {
              if (err) {
                emitter.emit('warning', Object.assign(new Error('Announcing didnt work'), {
                  code: 'EDHTLEGACYANNOUNCE',
                  key,
                  address,
                  cause: err
                }))
              }
              unlock()
            })
          } else {
            dht.unannounce(key, address.port, err => {
              if (err) {
                emitter.emit('warning', Object.assign(new Error('Unannouncing didnt work'), {
                  code: 'EDHTLEGACYUNANNOUNCE',
                  key,
                  address,
                  cause: err
                }))
              }
              unlock()
            })
          }
        }, cb)
      },
      close () {
        lock.sync(() => {
          dht.removeAllListeners()
          dht.on('error', onClose)
          dht.destroy(onClose)
          dht = null
        }, noop)
      }
    }

    function onClose (err) {
      if (err) {
        emitter.emit('warning', Object.assign(new Error('Error while closing'), {
          code: 'EDHTCLOSE',
          cause: err
        }))
      }
      emitter.emit('close')
    }

    function onPeer (rawPeer, infoHash, via) {
      const peer = Peer.create(rawPeer.port, rawPeer.host, {
        type: 'IPv4',
        mode: Peer.MODE.tcpOrUdp
      })
      peers.add(infoHash.toString('hex'), peer, peer.asString)
    }

    function onUnexpectedClose (err) {
      emitter.emit('warning', Object.assign(new Error('Legacy DHT unexpectedly closed.'), {
        code: 'EDHTLEGACYCLOSED',
        cause: err
      }))
      dht.removeAllListeners()
      dht.on('error', noop)
      dht = null
      emitter.emit('unlistening')
    }
  }
}
