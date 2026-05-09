import { createPaymentSessionId, cloneAmount, type PaymentAmount, type SessionIntent } from './types.js'
import { addPaymentAmounts } from './math.js'

export interface CreatePaymentSessionInput {
  protocol: 'mpp'
  method: 'solana'
  recipient: string
  funding: PaymentAmount
  requestHash: string
  expiresInSeconds?: number
}

export function createPaymentSession(input: CreatePaymentSessionInput): SessionIntent {
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? 3600) * 1000).toISOString()
  return {
    kind: 'session',
    protocol: input.protocol,
    method: input.method,
    sessionId: createPaymentSessionId(),
    recipient: input.recipient,
    funding: cloneAmount(input.funding),
    remaining: cloneAmount(input.funding),
    requestHash: input.requestHash,
    createdAt,
    expiresAt,
    status: 'active',
  }
}

export function topUpPaymentSession(session: SessionIntent, amount: PaymentAmount): SessionIntent {
  if (session.status !== 'active') throw new Error('SESSION_NOT_ACTIVE')
  const remaining = addPaymentAmounts(session.remaining, amount)
  return { ...session, remaining }
}

export function closePaymentSession(session: SessionIntent): SessionIntent {
  return { ...session, status: 'closed' }
}

export function isPaymentSessionExpired(session: SessionIntent, now = Date.now()): boolean {
  return Date.parse(session.expiresAt) <= now
}
