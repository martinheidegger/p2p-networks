'use strict'
module.exports = services => {
  return config => {
    const keys = Object.keys(config)
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
    service.validate(config[type])
    const serviceConfig = config[type]
    return {
      verify: () => service.verify(serviceConfig),
      create: service.create.bind(service, serviceConfig)
    }
  }
}
