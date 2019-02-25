'use strict'
module.exports = {
  'dht-legacy': () => require('./dht-legacy'),
  dht: () => require('./dht'),
  dns: () => require('./dns')
}
