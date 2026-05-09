import type { Invoice } from '../core/types.js'
import { PAYMENT_PROTOCOLS, type X402PaymentRequirement } from './types.js'

export function toX402PaymentRequirement(record: Invoice): X402PaymentRequirement {
  return {
    kind: 'x402',
    protocols: PAYMENT_PROTOCOLS,
    id: record.id,
    walletId: record.walletId,
    amount: record.amount,
    description: record.description,
    record,
  }
}
