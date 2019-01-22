'use strict'
const createDht = require('bittorrent-dht')

module.exports = {
  verify: () => true,
  create: (options, emitter, peers) => {
    let dht
    return {
      open: function () {
        dht = createDht()
        dht.on('peer', onPeer)
        dht.on('error', onUnexpectedClose)
        dht.on('warn', emitter.emit.bind(emitter, 'warning'))
      },
      lookup: function (key) {
        dht.lookup(key)
      },
      announce: function (key, address) {
        // TODO: announce only hosts that are non-local
        dht.announce(key, address.port, function (err) {
          // TODO error handling (eventually a lock might be a good idea?)
        })
      },
      unannounce: function (key, address) {
        // TODO: announce only hosts that are non-local
        dht.unannounce(key, address.port, function (err) {
          // TODO error handling (eventually a lock might be a good idea?)
        })
      },
      close: function () {
        dht.removeAllListeners()
        dht.on('error')
        dht.destroy(function (err) {
          dht = null
          emitter.emit('close', err)
        })
      }
    }

    function onPeer (peer, infoHash, via) {
      peers.addSimilar(infoHash.toString('hex'), peer)
    }

    function onUnexpectedClose (err) {
      if (err) {
        emitter.emit('warning', err)
      }
      // TODO
    }
  }
}
