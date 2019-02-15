'use strict'
const EventedMapOfSets = require('../../lib/EventedMapOfSets.js')
const tape = require('tape')
const toArray = require('../../lib/iter/toArray.js')

tape('basics: empty', t => {
  const set = new EventedMapOfSets()
  t.equals(set.hasEntry('x', 'y'), false)
  for (const entry of set.get('x')) {
    t.fail('Unexpected entry: ' + entry)
  }
  t.end()
})

tape('basics: add', t => {
  const set = new EventedMapOfSets()
  set.add('x', 'y')
  t.equals(set.hasEntry('x', 'y'), true)
  set.add('x', 'y') // repeat call
  t.deepEquals(toArray(set.get('x')), ['y'])
  set.add('x', 'z')
  t.deepEquals(toArray(set.get('x')), ['y', 'z'])
  t.end()
})

tape('basics: remove', t => {
  const set = new EventedMapOfSets()
  set.add('x', 'y')
  set.delete('x', 'y')
  t.equals(set.hasEntry('x', 'y'), false)
  for (const entry of set.get('x')) {
    t.fail('Unexpected entry: ' + entry)
  }
  t.end()
})

tape('basics: add-hash', t => {
  const set = new EventedMapOfSets()
  set.add('x', 'y', 'r')
  set.add('x', 'z', 'r')
  t.equals(set.hasEntry('x', 'r'), true)
  t.equals(set.hasEntry('x', 'y'), false)
  t.equals(set.hasEntry('x', 'z'), false)
  for (const entry of set.get('x')) {
    t.equals(entry, 'y')
  }
  t.end()
})

tape('events', t => {
  const set = new EventedMapOfSets()
  const stack = []
  set.on('add', (key, value, valueOrHash) => {
    stack.push({ add: { key, value, valueOrHash }})
  })
  set.on('delete', (key, value, valueOrHash) => {
    stack.push({ del: { key, value, valueOrHash }})
  })
  set.add('x', 'r', 'y')
  set.add('x', 'y')
  set.add('x', 'z')
  set.delete('x', 'y')
  set.delete('x', 'z')
  t.deepEquals(stack, [
    { add: { key: 'x', value: 'r', valueOrHash: 'y' } },
    { add: { key: 'x', value: 'z', valueOrHash: 'z' } },
    { del: { key: 'x', value: 'r', valueOrHash: 'y' } },
    { del: { key: 'x', value: 'z', valueOrHash: 'z' } }
  ])
  t.end()
})
