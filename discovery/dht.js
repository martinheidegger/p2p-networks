'use strict'
const dht = require('@hyperswarm/dht')

exports = {
  validate: (opts) => true,
  create: (opts, emitter) => {
    const node = dht({
      bootstrap: opts.bootstrap,
      ephemeral: false
    })

    return {
      announce: function (topic, client) {
        node.announce(client.topic, client )
      }
    }
  }
}
