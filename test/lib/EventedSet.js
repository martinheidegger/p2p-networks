'use strict'
const EventedSet = require('../../lib/EventedSet.js')
const tape = require('tape-x')()

tape('adding sends event', t => {
  const set = new EventedSet()
  set.on('change', (entry, isAdd) => {
    t.equals(entry, 'x')
    t.equals(isAdd, true)
    t.end()
  })
  set.add('x')
})

tape('adding again doesnt send event', t => {
  const set = new EventedSet()
  let called = 0
  set.on('change', () => called += 1)
  set.add('x')
  t.equals(called, 1)
  set.add('x')
  t.equals(called, 1)
  t.end()
})

tape('adding again doesnt send event', t => {
  const set = new EventedSet()
  let called = 0
  set.on('change', () => called += 1)
  set.add('x')
  t.equals(called, 1)
  set.add('x')
  t.equals(called, 1)
  t.end()
})

tape('adding and deleting sends both events', t => {
  const set = new EventedSet()
  const stack = []
  set.on('change', (_, isAdd) => stack.push(isAdd ? 'add' : 'delete'))
  set.add('x')
  set.delete('x')
  t.deepEquals(stack, ['add', 'delete'])
  t.end()
})

tape('deleting a nonexistant item shouldnt trigger anything', t => {
  const set = new EventedSet()
  const stack = []
  set.on('change', (_, isAdd) => stack.push(isAdd ? 'add' : 'delete'))
  set.delete('x')
  set.add('x')
  set.delete('x')
  set.delete('x')
  t.deepEquals(stack, ['add', 'delete'])
  t.end()
})

// TODO...
/*
tape('clearing should trigger events', t => {
  const set = new EventedSet()
  const stack = []
  set.on('add', entry => stack.push({ add: entry }))
  set.on('delete', entry => stack.push({ delete: entry }))
  set.add('x')
  set.add('y')
  set.clear()
  t.deepEquals(stack, [{ add: 'x' }, { add: 'y' }, { delete: 'x' }, { delete: 'y' }])
  t.end()
})
*/
