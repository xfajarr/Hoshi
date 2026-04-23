import type { Context, Next } from 'hono'
import type { ServiceRegistry } from '../core/registry.js'
import type { Meter } from '../core/meter.js'
import type { PaymentProof, X402PaymentRequirement } from '../core/types.js'

export function x402Middleware(registry: ServiceRegistry, meter: Meter) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const serviceId = c.req.param('serviceId')
    const pathParam = c.req.param('path')
    const path = '/' + (pathParam || '')

    if (!serviceId) {
      return c.json({ error: 'Service ID is required' }, 400)
    }

    const found = registry.findEndpoint(serviceId, path)
    if (!found) {
      return c.json({ error: 'Service or endpoint not found' }, 404)
    }

    const { endpoint } = found

    // Check for payment proof in headers
    const paymentHeader = c.req.header('X-Payment')
    
    if (!paymentHeader) {
      // Return 402 with payment requirements
      const requirement: X402PaymentRequirement = {
        scheme: 'x402',
        network: 'solana',
        token: 'USDC',
        amount: endpoint.price,
        recipient: c.env?.TREASURY_ADDRESS || 'HOSHI_TREASURY'
      }

      c.header('X-Payment-Required', JSON.stringify(requirement))
      return c.json({
        error: 'Payment required',
        paymentRequired: requirement
      }, 402)
    }

    // Parse payment proof
    let paymentProof: PaymentProof
    try {
      paymentProof = JSON.parse(paymentHeader) as PaymentProof
    } catch {
      return c.json({ error: 'Invalid payment proof format' }, 400)
    }

    // Record the request
    const request = {
      id: crypto.randomUUID(),
      serviceId: serviceId,
      endpointPath: path,
      paymentProof,
      timestamp: new Date().toISOString(),
      clientIp: c.req.header('x-forwarded-for') || 'unknown'
    }
    meter.record(request)

    // Store request ID in context for handler use
    c.set('requestId', request.id)
    c.set('paymentProof', paymentProof)

    return next()
  }
}
