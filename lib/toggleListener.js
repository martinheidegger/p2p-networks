'use strict'
module.exports = function toggleListener (target, event, handler, isTrue) {
  if (isTrue) {
    target.on(event, handler)
  } else {
    target.removeListener(event, handler)
  }
}
