'use strict'
const net = require('net')


module.exports = {
  validate: () => true,
  create: (opts, proxy) => {
    // TODO: validate options & throw error if wrong!
    const server = net.createServer()

    let _state = 'connecting'
    const _listener = {}
    setImmediate(() => proxy.emit('state', _state))
    server.listen(opts.port)
    server.on('connection', connection => {
      
    })
    server.on('listening', () => setState('connected'))
    server.on('error', error => {
      proxy.emit('log', { type: 'error', error: error })
      setState('broken')
      if (opts.reconnect > 0) {
        setTimeout(() => {
          setState('connecting')
          server.listen(opts.port)
        }, opts.reconnect)
      }
    })
    return {
      state: () => _state
    }

    function setState (state) {
      if (_state !== state) {
        _state = state
        proxy.emit('state', state)
      }
    }
  }
}
