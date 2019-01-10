module.exports = services => {
  return opts => {
    const keys = Object.keys(opts)
    if (keys.length === 0) {
      throw new Error('No service method specified.')
    }
    if (keys.length > 1) {
      throw new Error('Only one service method should be used per instance.')
    }
    const type = keys[0]
    const service = services[type]
    if (!service) {
      throw new Error(`Unsupported service type: ${type}`)
    }
    service.validate(opts[type])
    return emitter => service.create(opts[type], emitter)
  }
}
