import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryServiceRegistry, InMemoryMeter } from '../src/index.js'
import type { Service } from '../src/index.js'

describe('ServiceRegistry', () => {
  let registry: InMemoryServiceRegistry

  beforeEach(() => {
    registry = new InMemoryServiceRegistry()
  })

  it('should register and retrieve services', () => {
    const service: Service = {
      id: 'test',
      name: 'Test Service',
      description: 'A test service',
      baseUrl: 'https://example.com',
      endpoints: [
        { path: '/api', method: 'GET', description: 'Test endpoint', price: '1000', priceUnit: 'USDC' }
      ]
    }
    registry.register(service)
    expect(registry.get('test')).toEqual(service)
    expect(registry.list()).toHaveLength(1)
  })

  it('should find endpoints', () => {
    const service: Service = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      baseUrl: 'https://example.com',
      endpoints: [
        { path: '/api', method: 'GET', description: 'API', price: '1000', priceUnit: 'USDC' }
      ]
    }
    registry.register(service)

    const found = registry.findEndpoint('test', '/api')
    expect(found).toBeDefined()
    expect(found?.endpoint.price).toBe('1000')

    const notFound = registry.findEndpoint('test', '/notfound')
    expect(notFound).toBeUndefined()
  })
})

describe('Meter', () => {
  let meter: InMemoryMeter

  beforeEach(() => {
    meter = new InMemoryMeter()
  })

  it('should record and retrieve requests', () => {
    const request = {
      id: 'req-1',
      serviceId: 'test',
      endpointPath: '/api',
      timestamp: new Date().toISOString()
    }
    meter.record(request)
    expect(meter.getRequest('req-1')).toEqual(request)
    expect(meter.listRequests()).toHaveLength(1)
  })

  it('should calculate stats', () => {
    meter.record({
      id: 'req-1',
      serviceId: 'test',
      endpointPath: '/api',
      paymentProof: {
        txSignature: 'sig1',
        sender: 'sender1',
        recipient: 'recipient',
        amount: '10000',
        token: 'USDC',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })

    const stats = meter.getStats()
    expect(stats.totalRequests).toBe(1)
    expect(stats.totalRevenue).toBe('10000')
  })
})
