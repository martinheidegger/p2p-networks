'use strict'
let count = 0
const ids = {}
const reg = /\s*([0-9]+(\.[0-9]+)?)\s*(ms|(milli(sec(ond)?)?s?)|(s(ec(ond)?)?s?)|(m(in(ute)?)?s?)|(h(our)?s?)|(d(ay)?s?))?\s*/ig // 
const SEC = 1000
const MIN = SEC * 60
const HRS = MIN * 60
const DAY = HRS * 24
const factors = {
  ms: 1,
  milli: 1,
  millis: 1,
  millisec: 1,
  millisecs: 1,
  millisecond: 1,
  milliseconds: 1,
  s: SEC,
  sec: SEC,
  secs: SEC,
  second: SEC,
  seconds: SEC,
  m: MIN,
  min: MIN,
  mins: MIN,
  minute: MIN,
  minutes: MIN,
  h: HRS,
  hour: HRS,
  hours: HRS,
  d: DAY,
  day: DAY,
  days: DAY
}

function parsePart (part) {
  reg.lastIndex = -1
  const parts = reg.exec(part)
  if (!parts) {
    return null
  }
  let base = parseFloat(parts[1], 10)
  if (parts[3]) {
    base *= factors[parts[3].toLowerCase()]
  }
  return base
}

function parse (input) {
  if (typeof input === 'object' && input !== null) {
    return input
  }
  if (typeof input === 'number') {
    return { min: input, vary: 0 }
  }
  input = String(input)
  const parts = /(\s*(~|±)\s*(.+))?\s*$/g.exec(input)
  if (parts) {
    input = input.substr(0, parts.index)
  }
  const firstPart = parsePart(input)
  if (firstPart === null) {
    throw Object.assign(new Error('Invalid interval time specified'), { input, code: 'EINTINVALID' })
  }
  const result = { min: firstPart, vary: 0 }
  if (parts[1]) {
    const secondPart = parsePart(parts[3])
    if (secondPart === null) {
      throw Object.assign(new Error('Invalid interval range'), { input, code: 'EINTSECONDEMPTY' })
    }
    if (parts[2] === '±') {
      result.min -= (secondPart / 2) | 0
      result.vary = secondPart
    } else {
      result.vary = secondPart - result.min
    }
  }
  return result
}

function timeoutFactory (range) {
  range = parse(range)
  if (!range) {
    range = { min: 1000, vary: 0 }
  }
  return function (fn) {
    return setTimeout(fn, range.min + (range.vary * Math.random() | 0))
  }
}

module.exports = {
  parse: parse,
  set: function (fn, range, ...args) {
    count += 1
    let id = count
    const nextTimeout = timeoutFactory(range)
    ids[id] = nextTimeout(next)
    return id

    function next () {
      ids[id] = nextTimeout(next)
      fn.apply(null, args)
    }
  },
  clear: function (id) {
    clearTimeout(ids[id])
    delete ids[id]
  }
}
