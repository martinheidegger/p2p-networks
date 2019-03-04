# p2p-networks

**IMPORTANT NOTE**: This project is in pre-release phase - under heavy development and not resembling the final library.
The documentation here is a plan and guideline, not reflecting entirely how it is currently implemented.

## Goal

This project provides out-of-the-box networking for p2p systems. Originally it was built for [DAT](https://datproject.org),
but it is flexible enough to be used by a wide variety of p2p applications.

**Principles**

- Everything is specified through configuration.
    No hidden defaults, no random ports; every port that can be opened is specified in the configuration.
    Other solutions often pre-specify bootstrap defaults or ports that can be overwritten. This is not transparent enough
    when the application need to run on an end-users computer.
- Configuration can be hot-reloaded.
    This system allows that some network configuration can be changed while the system is running. This is particularly
    important when the networking stack is used by background workers/deamons.
- Clear, low-level status.
    Each part of the network will have a separate status stream.
- Plugability.
    Each implementation follows a minimal set of conventions. These conventions should allow you to plug your own implementation
    for a discovery or transport protocol.
- Low memory & reuse as much as possible
    A standard goal for most projects, this project particularly focusses on referencing of nodes in the right memory representation
    and making sure that only a single representation is used at a time (avoiding duplicates).

## General use:

```javascript
const { Network } = require('p2p-networks')
const network = new Network({
  // Plugin the systems that you need supported in your app or add your
  // own discovery/transport methods.
  discovery: {
    dht: require('p2p-networks/discovery/dht'),
    dns: require('p2p-networks/discovery/dns')
  },
  transport: {
    tcp: require('p2p-networks/transport/tcp'),
  }
})
network.update({
  paused: false,
  discovery: {
    dht: {
      bootstrap: ['a.b.com'],
      port: 3281
    }
  },
  transport: {
    tcp: {
      port: '3401~3499'
    }
  }
})
// Logging the state of the network
network.on('stats', stats => console.log(stats))

const readKey = '...' // Key used to ensure that just the correct data is sent through the channel
const discoveryKey = '...' // Key that is used to lookup the entry in the discovery channel

function createReplication () `{
  return new Duplex() // A duplex stream that contains the protocol/work for that key
}

const replicationStats = network.replicate(readKey, discoveryKey, createReplicationStream)
// Here we can track the replication state 
replicationStats.on('stats', state => console.log(state))

network.update({
  paused: true
})
```
