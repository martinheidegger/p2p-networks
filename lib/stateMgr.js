'use strict'

module.exports = function stateMgr (onChange, state) {
  return {
    set (newState) {
      if (state !== newState) {
        let oldState = state
        state = newState
        onChange(newState, oldState)
      }
    },
    get () {
      return state
    }
  }
}
