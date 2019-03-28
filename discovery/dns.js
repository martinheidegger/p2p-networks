'use strict'
const createMDNS = require('multicast-dns')
const crypto = require('crypto')
const filter = require('../lib/iter/filter.js')
const toArray = require('../lib/iter/toArray.js')
const tuples = require('../lib/iter/tuples.js')
const iterate = require('../lib/iter/iterate.js')
const Peer = require('../lib/Peer.js')
const rangeInterval = require('../lib/rangeInterval.js')
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

function * valuesOfValues (struct) {
  for (const value of struct.values()) {
    yield value.values()
  }
}


module.exports = {
  validate: (config) => true,
  create ({ domain, port, keySize, name, refreshInterval: rawInterval }, emitter, peers) {
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

        // TODO: Consider sending out the peers also as answer
        /*
        peers.on('change', (key, value, valueOrHash, add) => {
        })
        */
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
        if (address.type !== 'IPv4' || address.mode !== Peer.MODE.tcpOrUdp) {
          return cb(new Error('Only IPv4 and tcpOrUdp supported'))
        }
        const name = nameForKey(key)
        const addressId = address.port
        
        let answerMap = answersByName.get(name)
        if (doAnnounce) {
          if (answerMap === undefined) {
            answerMap = new Map()
            answersByName.set(name, answerMap)
          } else if (answerMap.has(addressId)) {
            return cb()
          }
          const answerSet = createAnswers(address, name)
          answerMap.set(addressId, answerSet)
        } else {
          if (answerMap === undefined) {
            return cb()
          }
          answerMap.delete(addressId)
          if (answerMap.size === 0) {
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

    function createAnswers (address, name) {
      if (address.type === 'IPv4') {
        return createIPv4Answers(address, name)
      }
      return []
    }

    function createIPv4Answers (address, name) {
      return [
        { type: 'SRV', name, data: { target: '0.0.0.0', port: address.port } },
        { type: 'TXT', name, data: [ Buffer.concat([Buffer.from('id='), crypto.randomBytes(32)]) ] }
      ]
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
          const peer = Peer.create(port, host)
          peers.add(key, peer, peer.asString)
        }
      ))
    }

    function isNotLookingForTopics () {
      return keyByName === undefined
    }

    function onQuery (res) {
      const relevantQuestions = filter(
        question => question.type === 'SRV' && answersByName.has(question.name),
        res.questions
      )
  
      const answers = toArray(answersForQuestions(res, relevantQuestions))
      if (answers !== undefined) {
        mDNS.respond({
          answers
        })
      }
    }

    function * answersForQuestions (res, questions) {
      for (const question of questions) {
        const answerSets = answersByName.get(question.name).values()
        const id = _getId(res, question.name)
        for (const answerSet of answerSets) {
          for (const answer of answerSet) {
            if (id && answer.id.equals(id)) {
              continue
            }
            yield answer
          }
        }
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
      const questions = toArray(allQuestions())
      if (questions !== undefined) {
        mDNS.query({
          questions
        }, null, null, cb)
      }
    }

    function * allQuestions () {
      for (const answerMap of answersByName.values()) {
        for (const answersSets of answerMap.values()) {
          for (const answerSet of answersSets) {
            for (const answer of answerSet) {
              yield answer
            }
          }
        }
      }
    }
  }
}

