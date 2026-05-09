import { createPaymentChallengeId, type PaymentChallenge, type PaymentChallengeInput } from './types.js'

export function createPaymentChallenge(input: PaymentChallengeInput): PaymentChallenge {
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? 300) * 1000).toISOString()
  return {
    challengeId: createPaymentChallengeId(),
    protocol: input.protocol,
    intent: input.intent,
    method: input.method,
    resource: input.resource,
    amount: input.amount,
    recipient: input.recipient,
    requestHash: input.requestHash,
    createdAt,
    expiresAt,
    metadata: input.metadata,
    status: 'pending',
  }
}

export function isPaymentChallengeExpired(challenge: PaymentChallenge, now = Date.now()): boolean {
  return Date.parse(challenge.expiresAt) <= now
}
