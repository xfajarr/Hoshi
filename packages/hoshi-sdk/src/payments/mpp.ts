import type { PaymentLink } from '../core/types.js'
import { PAYMENT_PROTOCOLS, type MppPaymentIntent } from './types.js'

export function toMppPaymentIntent(record: PaymentLink): MppPaymentIntent {
  return {
    kind: 'mpp',
    protocols: PAYMENT_PROTOCOLS,
    id: record.id,
    walletId: record.walletId,
    amount: record.amount,
    description: record.description,
    record,
  }
}
