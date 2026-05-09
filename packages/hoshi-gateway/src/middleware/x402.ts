import type { Context, Next } from 'hono'
import type { ServiceRegistry } from '../core/registry.js'
import type { Meter } from '../core/meter.js'
import {
  PaymentProofSchema,
  type PaymentProof,
  type X402PaymentRequirement,
} from '../core/types.js'

function buildRequirement(endpoint: { price: string; priceUnit: string }, treasuryAddress: string): X402PaymentRequirement {
  return {
    scheme: 'x402',
    network: 'solana',
    token: endpoint.priceUnit,
    amount: endpoint.price,
    recipient: treasuryAddress,
  }
}

function parsePaymentProof(paymentHeader: string): PaymentProof | null {
  const parsed = PaymentProofSchema.safeParse(JSON.parse(paymentHeader))
  return parsed.success ? parsed.data : null
}

export function x402Middleware(registry: ServiceRegistry, meter: Meter) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const serviceId = c.req.param('serviceId')
    const pathParam = c.req.param('path') ?? ''
    const path = pathParam.startsWith('/') ? pathParam : '/' + pathParam

    if (!serviceId) {
      return c.json({ error: 'Service ID is required' }, 400)
    }

    const found = registry.findEndpoint(serviceId, path)
    if (!found) {
      return c.json({ error: 'Service or endpoint not found' }, 404)
    }

    const { endpoint } = found
    const treasuryAddress = c.env?.TREASURY_ADDRESS || 'HOSHI_TREASURY'
    const requirement = buildRequirement(endpoint, treasuryAddress)
    const paymentHeader = c.req.header('X-Payment')

    if (!paymentHeader) {
      c.header('X-Payment-Required', JSON.stringify(requirement))
      return c.json({
        error: 'Payment required',
        paymentRequired: requirement,
      }, 402)
    }

    let paymentProof: PaymentProof | null = null
    try {
      paymentProof = parsePaymentProof(paymentHeader)
    } catch {
      return c.json({ error: 'Invalid payment proof format' }, 400)
    }

    if (!paymentProof) {
      c.header('X-Payment-Required', JSON.stringify(requirement))
      return c.json({
        error: 'Payment proof did not satisfy requirement',
        paymentRequired: requirement,
      }, 402)
    }

    if (
      paymentProof.recipient !== requirement.recipient ||
      paymentProof.token !== requirement.token ||
      paymentProof.amount !== requirement.amount
    ) {
      c.header('X-Payment-Required', JSON.stringify(requirement))
      return c.json({
        error: 'Payment proof did not match requirement',
        paymentRequired: requirement,
      }, 402)
    }

    const request = {
      id: crypto.randomUUID(),
      serviceId,
      endpointPath: path,
      paymentProof,
      timestamp: new Date().toISOString(),
      clientIp: c.req.header('x-forwarded-for') || 'unknown',
    }
    meter.record(request)

    c.set('requestId', request.id)
    c.set('paymentProof', paymentProof)

    return next()
  }
}
