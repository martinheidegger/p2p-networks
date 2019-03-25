'use strict'
const EventedSet = require('../../lib/EventedSet.js')
const EventedSetOfSets = require('../../lib/EventedSetOfSets.js')
const tape = require('tape-x')()

tape('basic op', t => {
  const set = new EventedSet()
  set.add('x')
  set.add('y')
  const set2 = new EventedSet()
  set2.add('y')
  set2.add('z')
  const combined = new EventedSetOfSets()
  combined.add(set)
  t.ok(combined.has('x'))
  t.ok(combined.has('y'))
  combined.add(set2)
  t.ok(combined.has('z'))
  t.equals(combined.size, 3)
  combined.delete(set)
  t.ok(!combined.has('x'))
  t.ok(combined.has('y'))
  t.ok(combined.has('z'))
  t.equals(combined.size, 2)
  combined.add(set2)
  t.ok(!combined.has('x'))
  t.ok(combined.has('y'))
  t.ok(combined.has('z'))
  t.end()
})

tape('events', t => {
  const set = new EventedSet()
  set.add('x')

  const combined = new EventedSetOfSets()
  const stack = []
  combined.on('change', (entry, isAdd) => stack.push({ entry, isAdd }))
  combined.add(set)
  t.deepEquals(stack, [{ isAdd: true, entry: 'x' }])
  set.add('y')
  t.deepEquals(stack, [{ isAdd: true, entry: 'x' }, { isAdd: true, entry: 'y' }])
  const set2 = new EventedSet()
  combined.add(set2)
  set2.add('y')
  t.deepEquals(stack, [{ isAdd: true, entry: 'x' }, { isAdd: true, entry: 'y' }])
  combined.delete(set)
  t.deepEquals(stack, [{ isAdd: true, entry: 'x' }, { isAdd: true, entry: 'y' }, { isAdd: false, entry: 'x' }])
  t.end()
})
