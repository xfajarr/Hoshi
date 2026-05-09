import type { Invoice, Money, PaymentLink } from '../core/types.js'

export const PAYMENT_PROTOCOLS = ['x402', 'mpp'] as const

export type PaymentProtocol = (typeof PAYMENT_PROTOCOLS)[number]
export type PaymentKind = 'x402' | 'mpp'

export type PaymentRecord = Invoice | PaymentLink

export interface PaymentWrapper<TRecord extends PaymentRecord = PaymentRecord> {
  kind: PaymentKind
  protocols: typeof PAYMENT_PROTOCOLS
  id: string
  walletId: string
  amount: Money
  description: string
  record: TRecord
}

export type X402PaymentRequirement = PaymentWrapper<Invoice>
export type MppPaymentIntent = PaymentWrapper<PaymentLink>
