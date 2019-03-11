'use strict'
const { parse, set, clear } = require('../../lib/rangeInterval')
const tape = require('tape-x')()

tape('parsing', t => {
  t.deepEquals(parse(1000), { min: 1000, vary: 0 }, 'number')
  t.deepEquals(parse('1000'), { min: 1000, vary: 0 }, 'number as string')
  t.deepEquals(parse('10.5'), { min: 10.5, vary: 0 }, 'number as float')
  const units = {
    1: ['ms', 'milli', 'millis', 'millisec', 'millisecs', 'Ms'],
    1000: ['s', 'sec', 'secs', 'second', 'seconds', 'S'],
    60000: ['m', 'min', 'mins', 'minute', 'minutes', 'M'],
    3600000: ['h', 'hour', 'hours', 'H'],
    86400000: ['d', 'day', 'days', 'DayS']
  }
  const nums = ['10.5 ', '00231.021315']
  Object.keys(units).forEach(factor => {
    units[factor].forEach(unit => {
      nums.forEach(num => {
        let input = `${num}${unit}`
        t.deepEquals(parse(input), { min: parseFloat(num) * factor, vary: 0 }, input)
      })
    })
  })
  t.deepEquals(parse('10~12'), { min: 10, vary: 2 }, 'Range with numbers')
  t.deepEquals(parse('10.5~11.5'), { min: 10.5, vary: 1 }, 'Range with floats')
  t.deepEquals(parse('1.5s±100'), { min: 1450, vary: 100 }, 'Variance with units')
  t.deepEquals(parse('10.5±1'), { min: 10.5, vary: 1 }, 'Variance with floats')
  t.deepEquals(parse('1.5s±1s'), { min: 1000, vary: 1000 }, 'Variance two units')
  t.end()
})

tape('Range interval immediately closed', t => {
  let closed = false
  let i = set(function () {
    if (closed) {
      throw new Error('Called, even though cleared')
    }
    closed = true
    clear(i)
    setTimeout(function () {
      t.ok('done')
      t.end()
    }, 10)
  }, '1')
})

tape('Ranged interval is ranged', t => {
  let count = 0
  let former = Date.now()
  let times = []
  let i = set(function () {
    if (count < 20) {
      let current = Date.now()
      times.push(current - former)
      former = current
      count += 1
      return
    }
    const range = times.reduce((range, duration) => {
      if (range.min > duration) range.min = duration
      if (range.max < duration) range.max = duration
      return range
    }, { min: Number.MAX_VALUE, max: Number.MIN_VALUE })
    clear(i)
    t.ok(range.max - range.min > 5, 'Its random, but its very unlikely be this close together: ' + JSON.stringify(range))
    t.end()
  }, '1~20')
})

tape('range errors are errors', t => {
  t.plan(1)
  try {
    parse('x')
  } catch (err) {
    t.equals(err.code, 'EINTINVALID')
  }
  t.end()
})

tape('second part can have errors too', t => {
  t.plan(1)
  try {
    parse('10~d')
  } catch (err) {
    t.equals(err.code, 'EINTSECONDEMPTY')
  }
  t.end()
})
