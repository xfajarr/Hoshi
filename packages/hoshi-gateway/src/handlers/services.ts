import type { Context } from 'hono'
import type { ServiceRegistry } from '../core/registry.js'
import type { Meter } from '../core/meter.js'

export function createServiceHandlers(registry: ServiceRegistry, meter: Meter) {
  return {
    listServices: (c: Context) => {
      const services = registry.list().map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        endpoints: s.endpoints.map(e => ({
          path: e.path,
          method: e.method,
          description: e.description,
          price: e.price,
          priceUnit: e.priceUnit
        }))
      }))
      return c.json({ services })
    },

    getService: (c: Context) => {
      const id = c.req.param('id') || ''
      const service = registry.get(id)
      if (!service) {
        return c.json({ error: 'Service not found' }, 404)
      }
      return c.json({ service })
    },

    getStats: (c: Context) => {
      const stats = meter.getStats()
      return c.json({ stats })
    },

    proxyRequest: (c: Context) => {
      const requestId = c.get('requestId')
      const paymentProof = c.get('paymentProof')

      // In a real implementation, this would proxy to the actual service
      return c.json({
        success: true,
        requestId,
        message: 'Request processed',
        payment: {
          amount: paymentProof.amount,
          token: paymentProof.token,
          txSignature: paymentProof.txSignature
        }
      })
    }
  }
}
