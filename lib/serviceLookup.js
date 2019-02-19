'use strict'
module.exports = services => {
  return config => {
    const keys = Object.keys(config || {})
    if (keys.length === 0) {
      throw Object.assign(new Error('No service specified.'), { code: 'ENOSERVICE' })
    }
    if (keys.length > 1) {
      throw Object.assign(new Error('Only one service method should be used per instance.'), { code: 'EMULTISERVICE', keys })
    }
    const type = keys[0]
    const service = services[type]
    if (!service) {
      throw Object.assign(new Error(`Unsupported service type: ${type}`), { code: 'EUNKOWNSERVICE', type })
    }
    service.validate(config[type])
    const serviceConfig = config[type]
    return {
      create: service.create.bind(service, serviceConfig)
    }
  }
}
