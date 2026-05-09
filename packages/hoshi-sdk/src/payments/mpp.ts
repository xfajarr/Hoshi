import type { PaymentLink } from '../core/types.js'
import { createPaymentChallenge, createPaymentSession } from './core/index.js'
import { PAYMENT_PROTOCOLS, type MppPaymentIntent } from './types.js'

export function toMppPaymentIntent(record: PaymentLink): MppPaymentIntent {
  const challenge = createPaymentChallenge({
    protocol: 'mpp',
    intent: 'charge',
    method: 'solana',
    resource: record.url,
    amount: record.amount,
    recipient: record.walletId,
    requestHash: record.id,
    expiresInSeconds: 300,
  })

  return {
    kind: 'mpp',
    protocols: PAYMENT_PROTOCOLS,
    id: record.id,
    walletId: record.walletId,
    amount: record.amount,
    description: record.description,
    record,
    challenge,
    charge: {
      kind: 'charge',
      protocol: 'mpp',
      method: 'solana',
      resource: record.url,
      amount: record.amount,
      recipient: record.walletId,
      requestHash: record.id,
      challengeId: challenge.challengeId,
    },
    session: createPaymentSession({
      protocol: 'mpp',
      method: 'solana',
      recipient: record.walletId,
      funding: record.amount,
      requestHash: record.id,
      expiresInSeconds: 3600,
    }),
  }
}
