'use strict'
module.exports = function listenerChange (target, targetEventName, onChange) {
  let count = 0
  target.on('newListener', eventName => {
    if (eventName !== targetEventName) return
    if (count === 0) {
      onChange(true)
    }
    count += 1
  })
  target.on('removeListener', eventName => {
    if (eventName !== targetEventName) return
    count -= 1
    if (count === 0) {
      onChange(false)
    }
  })
}
