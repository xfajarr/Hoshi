import { Hono } from 'hono'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryServiceRegistry, InMemoryMeter, x402Middleware } from '../src/index.js'
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

describe('x402 middleware', () => {
  function createGatewayApp() {
    const registry = new InMemoryServiceRegistry()
    const meter = new InMemoryMeter()

    registry.register({
      id: 'openai',
      name: 'OpenAI',
      description: 'OpenAI API services',
      baseUrl: 'https://api.openai.com',
      endpoints: [
        {
          path: '/v1/chat/completions',
          method: 'POST',
          description: 'Chat completions',
          price: '10000',
          priceUnit: 'USDC',
        },
      ],
    })

    const app = new Hono()
    app.all('/proxy/:serviceId/:path{.+}', x402Middleware(registry, meter), (c) => c.json({ ok: true }))
    return { app, meter }
  }

  it('returns a payment requirement when no proof is provided', async () => {
    const { app } = createGatewayApp()
    const response = await app.request('/proxy/openai/v1/chat/completions')

    expect(response.status).toBe(402)
    expect(response.headers.get('X-Payment-Required')).toBeTruthy()

    const body = await response.json()
    expect(body).toMatchObject({
      error: 'Payment required',
      paymentRequired: {
        scheme: 'x402',
        network: 'solana',
        token: 'USDC',
        amount: '10000',
        recipient: 'HOSHI_TREASURY',
      },
    })
  })

  it('rejects malformed payment proofs', async () => {
    const { app } = createGatewayApp()
    const response = await app.request('/proxy/openai/v1/chat/completions', {
      headers: {
        'X-Payment': '{not-json}',
      },
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Invalid payment proof format',
    })
  })

  it('accepts matching payment proofs and records them', async () => {
    const { app, meter } = createGatewayApp()
    const timestamp = new Date().toISOString()
    const response = await app.request('/proxy/openai/v1/chat/completions', {
      headers: {
        'X-Payment': JSON.stringify({
          txSignature: 'sig-1',
          sender: 'sender-1',
          recipient: 'HOSHI_TREASURY',
          amount: '10000',
          token: 'USDC',
          timestamp,
        }),
      },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true })
    expect(meter.getStats()).toMatchObject({ totalRequests: 1, totalRevenue: '10000' })
  })

  it('rejects proofs that do not match the requirement', async () => {
    const { app } = createGatewayApp()
    const response = await app.request('/proxy/openai/v1/chat/completions', {
      headers: {
        'X-Payment': JSON.stringify({
          txSignature: 'sig-2',
          sender: 'sender-2',
          recipient: 'someone-else',
          amount: '10000',
          token: 'USDC',
          timestamp: new Date().toISOString(),
        }),
      },
    })

    expect(response.status).toBe(402)
    expect(await response.json()).toMatchObject({
      error: 'Payment proof did not match requirement',
    })
  })
})
