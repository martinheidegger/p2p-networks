'use strict'
const tape = require('tape-x')()
const EventedMapOfSets = require('../../lib/EventedMapOfSets.js')
const toArray = require('../../lib/iter/toArray.js')

tape('basics: empty', async t => {
  const set = new EventedMapOfSets()
  t.equals(set.hasEntry('x', 'y'), false)
  for (const entry of set.get('x')) {
    t.fail('Unexpected entry: ' + entry)
  }
})

tape('basics: add', async t => {
  const set = new EventedMapOfSets()
  t.equals(await set.add('x', 'y'), true)
  t.equals(set.hasEntry('x', 'y'), true)
  t.equals(await set.add('x', 'y'), false, 'repeat call')
  t.deepEquals(toArray(set.get('x')), ['y'])
  await set.add('x', 'z')
  t.deepEquals(toArray(set.get('x')), ['y', 'z'])
})

tape('basics: remove', async t => {
  const set = new EventedMapOfSets()
  t.equals(await set.delete('x', 'y'), false)
  await set.add('x', 'y')
  t.equals(await set.delete('x', 'z'), false)
  t.equals(await set.delete('x', 'y'), true)
  t.equals(set.hasEntry('x', 'y'), false)
  for (const entry of set.get('x')) {
    t.fail('Unexpected entry: ' + entry)
  }
})

tape('basics: add-hash', async t => {
  const set = new EventedMapOfSets()
  t.equals(await set.add('x', 'y', 'r'), true)
  t.equals(await set.add('x', 'z', 'r'), false, 'different item with same hash')
  t.equals(set.hasEntry('x', 'r'), true)
  t.equals(set.hasEntry('x', 'y'), false)
  t.equals(set.hasEntry('x', 'z'), false)
  for (const entry of set.get('x')) {
    t.equals(entry, 'y')
  }
})

tape('basics: clear', async t => {
  const set = new EventedMapOfSets()
  await set.add('x', 'y')
  await set.add('a', 'b')
  await set.clear()
  t.equals(set.hasEntry('x', 'y'), false)
  t.equals(set.hasEntry('a', 'b'), false)
})

tape('events', async t => {
  const set = new EventedMapOfSets()
  const stack = []
  set.on('add', (key, value, valueOrHash) => {
    stack.push({ add: { key, value, valueOrHash }})
  })
  set.on('delete', (key, value, valueOrHash) => {
    stack.push({ del: { key, value, valueOrHash }})
  })
  await Promise.all([
    set.add('x', 'r', 'y'),
    set.add('x', 'y'),
    set.add('x', 'z'),
    set.delete('x', 'y'),
    set.delete('x', 'z'),
    set.add('a', 'b'),
    set.add('x', 'y'),
    set.clear()
  ])
  t.deepEquals(stack, [
    { add: { key: 'x', value: 'r', valueOrHash: 'y' } },
    { add: { key: 'x', value: 'z', valueOrHash: 'z' } },
    { del: { key: 'x', value: 'r', valueOrHash: 'y' } },
    { del: { key: 'x', value: 'z', valueOrHash: 'z' } },
    { add: { key: 'a', value: 'b', valueOrHash: 'b' } },
    { add: { key: 'x', value: 'y', valueOrHash: 'y' } },
    { del: { key: 'a', value: 'b', valueOrHash: 'b' } },
    { del: { key: 'x', value: 'y', valueOrHash: 'y' } }
  ])
})

tape('iteration', async t => {
  const set = new EventedMapOfSets()
  await set.add('x', 'y')
  await set.add('x', 'z')
  await set.add('a', 'b')
  await set.add('a', 'z')
  let count = 0
  for (const entry of set) {
    count++
    if (count === 1) return t.deepEquals(entry, { key: 'x', value: 'y' })
    if (count === 2) return t.deepEquals(entry, { key: 'x', value: 'z' })
    if (count === 3) return t.deepEquals(entry, { key: 'a', value: 'b' })
    if (count === 4) return t.deepEquals(entry, { key: 'a', value: 'z' })
    t.fail('Unexpected')
  }
  t.equal(count, 4)
})
