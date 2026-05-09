import type { Invoice, PaymentLink } from '../core/types.js'
import type {
  ChargeIntent,
  PaymentAmount,
  PaymentChallenge,
  PaymentCredential,
  PaymentIntent,
  PaymentReceipt,
  SessionIntent,
} from './core/index.js'

export const PAYMENT_PROTOCOLS = ['x402', 'mpp'] as const
export type PaymentProtocolUnion = (typeof PAYMENT_PROTOCOLS)[number]
export type PaymentProtocol = PaymentProtocolUnion
export type PaymentKind = PaymentProtocolUnion

export type PaymentRecord = Invoice | PaymentLink

export interface PaymentWrapper<TRecord extends PaymentRecord = PaymentRecord> {
  kind: PaymentKind
  protocols: typeof PAYMENT_PROTOCOLS
  id: string
  walletId: string
  amount: PaymentAmount
  description: string
  record: TRecord
  challenge: PaymentChallenge
  credential?: PaymentCredential
  receipt?: PaymentReceipt
}

export interface X402PaymentRequirement extends PaymentWrapper<Invoice> {
  kind: 'x402'
  challenge: PaymentChallenge
  charge: ChargeIntent
}

export interface MppPaymentIntent extends PaymentWrapper<PaymentLink> {
  kind: 'mpp'
  challenge: PaymentChallenge
  charge: ChargeIntent
  session?: SessionIntent
}

export type { PaymentAmount, PaymentChallenge, PaymentCredential, PaymentIntent, PaymentReceipt, SessionIntent }
