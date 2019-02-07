const BOOTSTRAP_DHT_HYPER = [
  'bootstrap1.hyperdht.org:49737',
  'bootstrap2.hyperdht.org:49737',
  'bootstrap3.hyperdht.org:49737'
]
const BOOTSTRAP_DHT_LEGACY_DISCOVERY = [
  'router.bittorrent.com:6881',
  'router.utorrent.com:6881',
  'dht.transmissionbt.com:6881'
]
const BOOTSTRAP_DHT_LEGACY_DAT = [
  'bootstrap1.datprotocol.com:6881',
  'bootstrap2.datprotocol.com:6881',
  'bootstrap3.datprotocol.com:6881',
  'bootstrap4.datprotocol.com:6881'
]
const BOOTSTRAP_DAT = [
  'discovery1.datprotocol.com',
  'discovery2.datprotocol.com'
]
//
// Multicast DNS has a default keysize of 20,
// for legacy reason DAT id's also only supported 20 entries
//
const LEGACY_KEY_MAX_SIZE = 20

module.exports = {
  pause: false,
  discovery: [
    /**
     * This is the default DNS setup as used by github.com/hyperswarm/discovery.
     * It runs on the special 5353 port and uses 20byte keys for lookup it comes
     * together with the default on dht.
     */
    // { dns: { port: 5353, domain: 'hyperswarm.local', keySize: LEGACY_KEY_MAX_SIZE } },
    // { dht: { port: 0, bootstrap: BOOTSTRAP_DHT_HYPER } },

    /**
     * This is the default DNS setup as used by github.com/mafintosh/dns-discovery.
     * Two sockets are opened, and the 20byte key limit is used. It usually works together
     * with github.com/mafintosh/discovery-channel, that opens a dht channel
     */
    // { dns: { port: 53, domain: 'dns-discovery.local', keySize: LEGACY_KEY_MAX_SIZE } },
    // { dns: { port: 5300, domain: 'dns-discovery.local', keySize: LEGACY_KEY_MAX_SIZE } },
    // { "dht-legacy": { port: 0, bootstrap: BOOTSTRAP_DHT_LEGACY_DISCOVERY } },

    /**
     * This is the default setup for p2p-networks. It doesnt have a size-limit on keys (uses 32byte keys)
     */
    { dns: { port: 53, domain: 'p2p-net.local', bootstrap: BOOTSTRAP_DAT } },
    { dns: { port: 5300, domain: 'p2p-net.local', bootstrap: BOOTSTRAP_DAT } },

    /**
     * This is the default DNS setup as used in DAT@2 github.com/datproject/dat-swarm-defaults
     * Two sockets are opened and the 20byte key limit applies.
     * The dht part
     */
    // { dns: { port: 53, domain: 'dat.local', bootstrap: BOOTSTRAP_DAT, keySize: LEGACY_KEY_MAX_SIZE } },
    // { dns: { port: 5300, domain: 'dat.local', bootstrap: BOOTSTRAP_DAT, keySize: LEGACY_KEY_MAX_SIZE } },
    // { 'dht-legacy': { port: 0, bootstrap: BOOTSTRAP_DHT_LEGACY_DAT } }
  ],
  transport: [
    { tcp: { port: 0 } },
    { udp: { port: 0 } }
  ]
}
