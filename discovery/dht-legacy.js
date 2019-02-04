'use strict'
const createDht = require('bittorrent-dht')
const ipv4Peers = require('ipv4-peers')

module.exports = {
  verify: () => true,
  create: (options, emitter, peers) => {
    let dht
    return {
      open: function () {
        dht = createDht({
          bootstrap: options.bootstrap
        })
        dht.on('peer', onPeer)
        dht.on('close', onUnexpectedClose)
        dht.on('error', onUnexpectedClose)
        dht.on('warn', emitter.emit.bind(emitter, 'warning'))
        dht.on('listening', emitter.emit.bind(emitter, 'listening'))
      },
      lookup: function (key, cb) {
        dht.lookup(key, function (err, data, more) {
          cb()
        })
      },
      announce: function (key, address, cb) {
        // TODO: announce only hosts that are non-local
        dht.announce(key, address.port, function (err) {
          if (err) {
            console.log(`ERROR: ${err}, announced!`)
          }
          // TODO error handling (eventually a lock might be a good idea?)
          cb()
        })
      },
      unannounce: function (key, address, cb) {
        // TODO: announce only hosts that are non-local
        dht.unannounce(key, address.port, function (err) {
          // TODO error handling (eventually a lock might be a good idea?)
          console.log(`ERROR: ${err}, unnanounce`)
          cb()
        })
      },
      close: function () {
        dht.removeAllListeners()
        dht.on('error', err => {})
        dht.destroy(function (err) {
          dht = null
          emitter.emit('close', err)
        })
      }
    }

    function onPeer (peer, infoHash, via) {
      peers.add(infoHash.toString('hex'), ipv4Peers.encode([peer]), infoHash)
    }

    function onUnexpectedClose (err) {
      if (err) {
        emitter.emit('warning', err)
      }
      // TODO
    }
  }
}
