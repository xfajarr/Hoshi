import { createPaymentCredentialId, type PaymentChallenge, type PaymentCredential, type PaymentCredentialInput } from './types.js'

export function createPaymentCredential(input: PaymentCredentialInput): PaymentCredential {
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? 300) * 1000).toISOString()

  return {
    credentialId: createPaymentCredentialId(),
    challengeId: input.challenge.challengeId,
    protocol: input.challenge.protocol,
    intent: input.challenge.intent,
    method: input.challenge.method,
    requestHash: input.challenge.requestHash,
    payload: input.payload,
    createdAt,
    expiresAt,
  }
}

export function isPaymentCredentialExpired(credential: PaymentCredential, now = Date.now()): boolean {
  return Date.parse(credential.expiresAt) <= now
}

export function bindCredentialToChallenge(challenge: PaymentChallenge, payload: Record<string, unknown>): PaymentCredential {
  return createPaymentCredential({ challenge, payload })
}
