import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { InMemoryServiceRegistry } from './core/registry.js'
import { InMemoryMeter } from './core/meter.js'
import { x402Middleware } from './middleware/x402.js'
import { createServiceHandlers } from './handlers/services.js'
import type { Service } from './core/types.js'

// Initialize core
const registry = new InMemoryServiceRegistry()
const meter = new InMemoryMeter()

// Register sample services
const sampleServices: Service[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI API services',
    baseUrl: 'https://api.openai.com',
    endpoints: [
      {
        path: '/v1/chat/completions',
        method: 'POST',
        description: 'Chat completions',
        price: '10000', // 0.01 USDC (6 decimals)
        priceUnit: 'USDC'
      },
      {
        path: '/v1/embeddings',
        method: 'POST',
        description: 'Text embeddings',
        price: '1000',
        priceUnit: 'USDC'
      }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Anthropic Claude API',
    baseUrl: 'https://api.anthropic.com',
    endpoints: [
      {
        path: '/v1/messages',
        method: 'POST',
        description: 'Claude messages',
        price: '10000',
        priceUnit: 'USDC'
      }
    ]
  }
]

for (const service of sampleServices) {
  registry.register(service)
}

// Create handlers
const handlers = createServiceHandlers(registry, meter)

// Build app
const app = new Hono()

app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }))
app.get('/services', handlers.listServices)
app.get('/services/:id', handlers.getService)
app.get('/stats', handlers.getStats)

// Protected routes with x402 middleware
app.all('/proxy/:serviceId/*', x402Middleware(registry, meter), handlers.proxyRequest)

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`Hoshi Gateway running on http://localhost:${info.port}`)
})

export { app, registry, meter }
