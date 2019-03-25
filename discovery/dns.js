'use strict'
const createMDNS = require('multicast-dns')
const crypto = require('crypto')
const filter = require('../lib/iter/filter.js')
const map = require('../lib/iter/map.js')
const combine = require('../lib/iter/combine.js')
const toArray = require('../lib/iter/toArray.js')
const tuples = require('../lib/iter/tuples.js')
const iterate = require('../lib/iter/iterate.js')
const createPeer = require('../lib/createPeer.js')
const rangeInterval = require('../lib/rangeInterval.js')
const toggleListener = require('../lib/toggleListener.js')
const nw = require('../lib/Networks.js')()

const noop = () => {}

function _getId (res, name) {
  for (const a of res.answers) {
    if (a.type === 'TXT' && a.name === name && a.data.length) {
      return a.data[0]
    }
  }
  return null
}


module.exports = {
  validate: (config) => true,
  create ({ domain, port, keySize, name, refreshInterval: rawInterval }, emitter, peers, keyByAddress) {
    const tld = '.' + domain
    let mDNS = null
    const answersByName = new Map()
    let keyByName
    const lookupIntervalRange = rangeInterval.parse(rawInterval)
    let lookupInterval

    return {
      open () {
        mDNS = createMDNS({ port })
        mDNS.on('response', onResponse)
        mDNS.on('query', onQuery)
        mDNS.on('error', onUnexpectedClose)
        mDNS.on('warning', err => {
          emitter.emit('warning', Object.assign(new Error('Unexpected error'), {
            code: 'EDNSWARN',
            cause: err
          }))
        })
        mDNS.on('ready', () => emitter.emit('listening'))
      },

      toggleSearch (key, doSearch, cb) {
        const name = nameForKey(key)
        if (doSearch) {
          if (keyByName === undefined) {
            toggleInterval(true)
            keyByName = {}
          }
          keyByName[name] = key
          return lookupOne(key, name, cb)
        }
        delete keyByName[name]
        for (const _ in keyByName) {
          // The first key is an indication that we still need to lookup
          return cb()
        }
        keyByName = undefined
        toggleInterval(false)
        cb()
      },
      toggleAnnounce (key, address, doAnnounce, cb) {
        const name = nameForKey(key)
        
        let answers = answersByName.get(name)
        if (doAnnounce) {
          if (answers === undefined) {
            answers = new Map()
            answersByName.set(name, answers)
          } else if (answers.has(address.port)) {
            return cb()
          }
          answers.set(address.port, [
            { type: 'SRV', name, data: { target: '0.0.0.0', port: address.port } },
            { type: 'TXT', name, data: [ Buffer.concat([Buffer.from('id='), crypto.randomBytes(32)]) ] }
          ])
        } else {
          if (answers === undefined) {
            return cb()
          }
          answers.delete(address.port)
          if (answers.size === 0) {
            answersByName.delete(name)
            delete keyByName[name]
          }
        }

        cb()
      },
      close () {
        mDNS.removeAllListeners()
        mDNS.once('error', onClose)
        mDNS.destroy(onClose)
        mDNS = null
        answersByName.clear()
      }
    }

    function toggleInterval (active) {
      if (active) {
        lookupInterval = rangeInterval.set(lookupAll, lookupIntervalRange)
      } else {
        lookupInterval = rangeInterval.clear(lookupInterval)
        lookupInterval = undefined
      }
    }

    function onClose (err) {
      if (err) {
        emitter.emit('warning', Object.assign(new Error('Error while closing'), {
          code: 'EDNSCLOSED',
          cause: err
        }))
      }
      rangeInterval.clear(lookupInterval)
      emitter.on('error', noop)
      emitter.emit('close')
    }

    function onUnexpectedClose (err) {
      emitter.emit('warning', Object.assign(new Error('Legacy DHT unexpectedly closed.'), {
        code: 'EDNSCLOSED',
        cause: err
      }))
      mDNS.removeAllListeners()
      mDNS = null
      emitter.emit('unlistening')
    }

    function nameForKey (key) {
      if (keySize > 0) {
        return key.toString('hex').slice(0, keySize) + tld
      }
      const parts = [domain]
      let offset = 0
      while (offset < key.length) {
        parts.unshift(key.slice(offset, offset += 32).toString('hex'))
      }
      return parts.join('.')
    }

    function onResponse (res, rinfo) {
      if (isNotLookingForTopics()) {
        return
      }
      iterate(tuples(res.answers,
        a => a.type === 'SRV' && keyByName[a.name],
        (b, a) => b.type === 'TXT' && b.name === a.name,
        (answer, idAnswer) => {
          const id = idAnswer.data[0]
          const port = answer.data.port
          if (isOwnAnnouncement(answer.name, port, id)) {
            return
          }
          const host = nw.preferInternalForLocal('IPv4',
            answer.data.target === '0.0.0.0' ? rinfo.address : answer.data.target
          )
          const key = keyByName[answer.name]
          const remoteRecord = createPeer( port, host )
          peers.add(key, remoteRecord, remoteRecord.asString)
        }
      ))
    }

    function isNotLookingForTopics () {
      return keyByName === undefined
    }

    function onQuery (res, rinfo) {
      const answers = toArray(
        combine( // each query contains a set of answers, flat them
          combine( // each answer is an array of answers, flat them
            map(
              q => {
                const answers = answersByName.get(q.name).values()
                const id = _getId(res, q.name)
                if (id) {
                  return filter(announcement => announcement.id.equals(id), answers)
                }
                return answers
              },
              filter(q =>
                q.type === 'SRV' &&
                answersByName.has(q.name)
              , res.questions)
            )
          )
        )
      )
      if (answers !== undefined) {
        mDNS.respond({
          answers
        })
      }
    }

    function isOwnAnnouncement (name, port, id) {
      const answers = answersByName.get(name)
      if (answers === undefined) {
        return false
      }
      const answerByPort = answers.get(port)
      if (answerByPort === undefined) {
        return false
      }
      const isSameId = Buffer.compare(answerByPort[1].data[0], id) === 0
      return !isSameId
    }

    function lookupOne (key, _name, cb) {
      const query = {
        questions: [{
          type: 'SRV',
          name: _name || nameForKey(key)
        }]
      }
      mDNS.query(query, null, null, cb)
    }
  
    function lookupAll (cb) {
      const query = {
        questions: map(
          key => ({
            type: 'SRV',
            name: nameForKey[key]
          }),
          searching.entries()
        )
      }
      mDNS.query(query, null, null, cb)
    }
  }
}

