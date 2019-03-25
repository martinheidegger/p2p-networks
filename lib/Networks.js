'use strict'
const os = require('os')
const objectHash = require('object-hash')
const { EventEmitter } = require('events')
const hasListener = require('./hasListener')

let instance

const MAX_AGE = 250

function keyForInfo (interfaceId, info) {
  return JSON.stringify([
    interfaceId,
    info.mac,
    info.family,
    info['scopeid'] || 0
  ])
}

function * flatten (interfaces) {
  const keys = new Map()
  for (const interfaceId in interfaces) {
    for (const info of interfaces[interfaceId]) {
      const key = keyForInfo(interfaceId, info)
      const entry = {
        ...info,
        key,
        hash: objectHash(info),
        interfaceId
      }
      if (keys.has(key)) {
        this.emit('warning', Object.assign(new Error(`Multiple network interfaces with same key detected ${key}`), {
          a: keys.get(key),
          b: entry,
          interfaceId,
        }))
        continue
      }
      keys.set(key, entry)
      yield entry
    }
  }
}

class Networks extends EventEmitter {

  constructor ({ maxAge }) {
    super()
    this.maxAge = maxAge
    this.localAddressByFamily = new Map()
    this.current = new Map()
    this.nextUpdate = Date.now()
    let timeout
    hasListener(this, 'change', active => {
      this.hasChangeListener = active
      if (active) {
        const refreshTimeout = () => {
          timeout = setTimeout(() => {
            this.update()
            refreshTimeout()
          }, this.nextUpdate - Date.now())
        }
        refreshTimeout()
      } else {
        clearTimeout(timeout)
        timeout = undefined
      }
    })
  }

  isLocalAddress (family, address) {
    this.checkUpdate()
    const localAddresses = this.localAddressByFamily.get(family)
    if (localAddresses === undefined) {
      return false
    }
    return localAddresses.has(address)
  }

  preferInternalForLocal (family, address) {
    if (!this.isLocalAddress(family, address)) {
      return address
    }
    for (const entry of this.current.values()) {
      if (entry.family === family && entry.internal) {
        return entry.address
      }
    }
    return address
  }

  checkUpdate () {
    if (this.nextUpdate <= Date.now()) {
      this.update()
    }
  }

  update () {
    this.nextUpdate = Date.now() + this.maxAge
    const deletedKeys = new Set(this.current.keys())
    for (const entry of flatten(os.networkInterfaces())) {
      const { key, hash } = entry
      const oldEntry = this.current.get(key)
      this.current.set(key, entry)
      if (oldEntry !== undefined) {
        deletedKeys.delete(key)
        if (oldEntry.hash === hash) {
          continue
        }
        this._updateEntry(oldEntry, entry)
      } else {
        this._addEntry(entry)
      }
    }
    for (const key of deletedKeys) {
      const entry = this.current.get(key)
      this.current.delete(key)
      this._deleteEntry(entry)
    }
  }

  _updateEntry (oldEntry, newEntry) {
    this._deleteLocalLookup(oldEntry)
    this._addLocalLookup(newEntry)
    if (this.hasChangeListener) this.emit('change', { type: 'update', newEntry, oldEntry })
  }
  

  _deleteEntry (entry) {
    this._deleteLocalLookup(entry)
    if (this.hasChangeListener) this.emit('change', { type: 'delete', entry })
  }

  _addEntry (entry) {
    this._addLocalLookup(entry)
    if (this.hasChangeListener) this.emit('change', { type: 'add', entry })
  }

  _deleteLocalLookup (entry) {
    const { family } = entry
    let localAddresses = this.localAddressByFamily.get(family)
    if (localAddresses === undefined) {
      return
    }
    localAddresses.delete(entry.address)
  }

  _addLocalLookup (entry) {
    const { family } = entry
    let localAddresses = this.localAddressByFamily.get(family)
    if (localAddresses === undefined) {
      localAddresses = new Set()
      this.localAddressByFamily.set(family, localAddresses)
    }
    localAddresses.add(entry.address)
  }
}

function init () {
  if (instance === undefined) {
    instance = new Networks({ maxAge: MAX_AGE })
  }
  return instance
}
init.Networks = Networks

module.exports = init

