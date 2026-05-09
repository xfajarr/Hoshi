import type { Invoice } from '../core/types.js'
import { createPaymentChallenge } from './core/index.js'
import { PAYMENT_PROTOCOLS, type X402PaymentRequirement } from './types.js'

export function toX402PaymentRequirement(record: Invoice): X402PaymentRequirement {
  const challenge = createPaymentChallenge({
    protocol: 'x402',
    intent: 'charge',
    method: 'solana',
    resource: record.paymentLink,
    amount: record.amount,
    recipient: record.walletId,
    requestHash: record.id,
    expiresInSeconds: 300,
  })

  return {
    kind: 'x402',
    protocols: PAYMENT_PROTOCOLS,
    id: record.id,
    walletId: record.walletId,
    amount: record.amount,
    description: record.description,
    record,
    challenge,
    charge: {
      kind: 'charge',
      protocol: 'x402',
      method: 'solana',
      resource: record.paymentLink,
      amount: record.amount,
      recipient: record.walletId,
      requestHash: record.id,
      challengeId: challenge.challengeId,
    },
  }
}
