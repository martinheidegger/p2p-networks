'use strict'
const createMDNS = require('multicast-dns')
const crypto = require('crypto')
const filter = require('../lib/iter/filter')
const map = require('../lib/iter/map')
const combine = require('../lib/iter/combine')
const toArray = require('../lib/iter/toArray')
const tuples = require('../lib/iter/tuples')
const iterate = require('../lib/iter/tuples')
const ipv4Peers = require('ipv4-peers')

function _getId (res, name) {
  for (const a of res.answers) {
    if (a.type === 'TXT' && a.name === name && a.data.length) {
      return a.data[0]
    }
  }
  return null
}


exports = {
  validate: (config) => true,
  create: (config, emitter, peers, keyAddressPair) => {
    const domain = config.domain || 'hyperswarm.local'
    const tld = '.' + domain
    let mDNS = null
    const answersByName = new Map()

    function nameForKey (key) {
      return key.toString('hex') + tld
    }

    function keyForName (key) {
      return key.slice(0, -tld.length)
    }

    function onResponse (res, rinfo) {
      iterate(tuples(res.answers,
        a => a.type === 'SRV' && answersByName.has(a.name),
        (b, a) => b.type === 'TXT' && b.name === a.name,
        (answer, idAnswer) => {
          const id = idAnswer.data[0]
          const host = answer.data.target === '0.0.0.0' ? rinfo.address : answer.data.target
          const port = answer.data.port
          const answers = answersByName.get(answer.name)
          if (answers.has(port) && answers.get(port)[1].data[0] === id) {
            return
          }

          const key = keyForName(answer.name)

          const remoteRecord = ipv4Peers.encode([ { port, host } ])
          remoteRecord.port = port
          remoteRecord.host = host
          remoteRecord.hash = remoteRecord.toString('base64')

          peers.add(Buffer.from(key), remoteRecord, key)
        }
      ))
    }

    function onQuery (res, rinfo) {
      const answers = toArray(combine(
        map(
          filter(res.questions, q => q.type === 'SRV' && answersByName.has(q.name)),  
          q => {
            let answers = answersByName.get(q.name).values()
            const id = _getId(res, q.name)
            if (id) {
              return filter(answers, announcement => announcement.id.equals(id))
            }
            return answers
          }
        )
      ))
      
      if (answers !== undefined) {
        mDNS.response({
          answers
        }, rinfo)
      }
    }

    function lookup (key, _name) {
      mDNS.query({
        questions: [{
          type: 'SRV',
          name: _name || nameForKey(key)
        }]
      })
    }

    return {
      open () {
        mDNS = createMDNS({
          port: config.port
        })
        mDNS.on('response', onResponse)
        mDNS.on('query', onQuery)
      },

      lookup,
      announce (key, address) {
        const name = nameForKey(key)
        
        let answers = answersByName.get(name)
        if (answers === undefined) {
          answers = new Map()
          answersByName.set(name, answers)
        } else if (answers.has(address.port)) {
          return
        }
        answers.set(address.port, [
          { type: 'SRV', name, data: { target: '0.0.0.0', port: address.port } },
          { type: 'TXT', name, data: [ Buffer.concat([Buffer.from('id='), crypto.randomBytes(32)]) ] }
        ])

        lookup(key, name)
      },
      unannounce (key, address) {
        const name = nameForKey(key)
        const answers = answersByName.get(name)
        if (answers === undefined) {
          return
        }
        answers.delete(address.port)
        if (answers.size === 0) {
          answersByName.delete(name)
        }
      },
      close (cb) {
        mDNS.removeListener('response', onResponse)
        mDNS.removeListener('query', onQuery)
        mDNS.close(cb)
        mDNS = null
        answersByName.clear()
      }
    }
  }
}


function hash (secret, host) {
  return crypto.createHash('sha256').update(secret).update(host).digest('base64')
}

function decodeTxt (bufs) {
  var data = {}

  for (var i = 0; i < bufs.length; i++) {
    var buf = bufs[i]
    var j = buf.indexOf(61) // '='
    if (j === -1) data[buf.toString()] = true
    else data[buf.slice(0, j).toString()] = buf.slice(j + 1).toString()
  }

  return data
}

function encodeTxt (data) {
  var keys = Object.keys(data)
  var bufs = []

  for (var i = 0; i < keys.length; i++) {
    bufs.push(Buffer.from(keys[i] + '=' + data[keys[i]]))
  }

  return bufs
}
