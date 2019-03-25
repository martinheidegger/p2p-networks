'use strict'
const tape = require('tape-x')()
const EventedSet = require('../../lib/EventedSet.js')
const Evented2DMatrix = require('../../lib/Evented2DMatrix.js')
const toArray = require('../../lib/iter/toArray.js')

function immediate () {
  return new Promise(setImmediate)
}

tape('basic', async t => {
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

tape('events', async t => {
  const keys = new EventedSet()
  const values = new EventedSet()
  const mtx = new Evented2DMatrix(keys, values)
  const stack = []
  mtx.on('change', (key, value, isAdd) => stack.push({ key, value, isAdd }))
  keys.add('x')
  values.add('a')
  keys.add('y')
  values.add('b')
  values.delete('a')
  keys.delete('x')
  await immediate()
  t.deepEquals(stack, [
    { isAdd: true, key: 'x', value: 'a' },
    { isAdd: true, key: 'y', value: 'a' },
    { isAdd: true, key: 'x', value: 'b' },
    { isAdd: true, key: 'y', value: 'b' },
    { isAdd: false, key: 'x', value: 'a' },
    { isAdd: false, key: 'y', value: 'a' },
    { isAdd: false, key: 'x', value: 'b' },
  ])
})
