'use strict'

module.exports = function hasListener (target, targetEvent, handler) {
  let count = target.listenerCount(targetEvent)
  handler(count > 0)
  target.on('newListener', newListener)
  target.on('removeListener', removeListener)

  return function stopLookingForListener () {
    target.removeListener('newListener', newListener)
    target.removeListener('removeListener', removeListener)
  }

  function newListener (event) {
    if (event !== targetEvent) {
      return
    }
    count += 1
    if (count === 1) {
      handler(true)
    }
  }

  function removeListener (event) {
    if (event !== targetEvent) {
      return
    }
    count -= 1
    if (count === 0) {
      handler(false)
    }
  }
}
