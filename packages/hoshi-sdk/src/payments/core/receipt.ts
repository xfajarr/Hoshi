import { createPaymentReceiptId, type PaymentChallenge, type PaymentCredential, type PaymentReceipt } from './types.js'

export function createPaymentReceipt(challenge: PaymentChallenge, _credential: PaymentCredential, reference: string): PaymentReceipt {
  return {
    receiptId: createPaymentReceiptId(),
    challengeId: challenge.challengeId,
    protocol: challenge.protocol,
    intent: challenge.intent,
    method: challenge.method,
    requestHash: challenge.requestHash,
    amount: challenge.amount,
    recipient: challenge.recipient,
    reference,
    settledAt: new Date().toISOString(),
  }
}
