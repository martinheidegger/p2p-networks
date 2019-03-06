'use strict'
const tape = require('tape')
const EventedSet = require('../../lib/EventedSet.js')
const Evented2DMatrix = require('../../lib/Evented2DMatrix.js')
const toArray = require('../../lib/iter/toArray.js')

function test (name, fn) {
  tape(`Evented2DMatrix > ${name}`, t => {
    fn(t)
      .catch(err => t.fail(err))
      .then(() => t.end())
  })
}

function immediate () {
  return new Promise(setImmediate)
}

test('basic', async t => {
  const keys = new EventedSet()
  const values = new EventedSet()
  const mtx = new Evented2DMatrix(keys, values)
  keys.add('x')
  await immediate()
  t.equals(toArray(mtx), undefined)
  values.add('y')
  await immediate()
  t.deepEquals(toArray(mtx), [{ key: 'x', value: 'y' }])
  values.add('z')
  await immediate()
  t.deepEquals(toArray(mtx), [
    { key: 'x', value: 'y'},
    { key: 'x', value: 'z'}
  ])
  await immediate()
  keys.add('a')
  await immediate()
  t.deepEquals(toArray(mtx), [
    { key: 'x', value: 'y'},
    { key: 'x', value: 'z'},
    { key: 'a', value: 'y'},
    { key: 'a', value: 'z'}
  ])
})

test('events', async t => {
  const keys = new EventedSet()
  const values = new EventedSet()
  const mtx = new Evented2DMatrix(keys, values)
  const stack = []
  mtx.on('add', (key, value) => stack.push({ add: { key, value } }))
  mtx.on('delete', (key, value) => stack.push({ delete: { key, value } }))
  keys.add('x')
  values.add('a')
  keys.add('y')
  values.add('b')
  values.delete('a')
  keys.delete('x')
  await immediate()
  t.deepEquals(stack, [
    { add: { key: 'x', value: 'a' } },
    { add: { key: 'y', value: 'a' } },
    { add: { key: 'x', value: 'b' } },
    { add: { key: 'y', value: 'b' } },
  ])
})
