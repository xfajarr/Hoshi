import { randomUUID } from 'node:crypto'

export type PaymentProtocol = 'x402' | 'mpp'
export type PaymentIntent = 'charge' | 'session'
export type PaymentMethodId = 'solana'
export type PaymentAsset = 'SOL' | 'USDC'

export interface PaymentAmount {
  amount: string
  asset: PaymentAsset
}

export interface PaymentChallengeInput {
  protocol: PaymentProtocol
  intent: PaymentIntent
  method: PaymentMethodId
  resource: string
  amount: PaymentAmount
  recipient: string
  requestHash: string
  expiresInSeconds?: number
  metadata?: Record<string, unknown>
}

export interface PaymentChallenge {
  challengeId: string
  protocol: PaymentProtocol
  intent: PaymentIntent
  method: PaymentMethodId
  resource: string
  amount: PaymentAmount
  recipient: string
  requestHash: string
  createdAt: string
  expiresAt: string
  metadata?: Record<string, unknown>
  status: 'pending' | 'verified' | 'expired'
}

export interface PaymentCredentialInput {
  challenge: PaymentChallenge
  payload: Record<string, unknown>
  expiresInSeconds?: number
}

export interface PaymentCredential {
  credentialId: string
  challengeId: string
  protocol: PaymentProtocol
  intent: PaymentIntent
  method: PaymentMethodId
  requestHash: string
  payload: Record<string, unknown>
  createdAt: string
  expiresAt: string
}

export interface PaymentReceipt {
  receiptId: string
  challengeId: string
  protocol: PaymentProtocol
  intent: PaymentIntent
  method: PaymentMethodId
  requestHash: string
  amount: PaymentAmount
  recipient: string
  reference: string
  settledAt: string
}

export interface ChargeIntent {
  kind: 'charge'
  protocol: PaymentProtocol
  method: PaymentMethodId
  resource: string
  amount: PaymentAmount
  recipient: string
  requestHash: string
  challengeId: string
}

export interface SessionIntent {
  kind: 'session'
  protocol: PaymentProtocol
  method: PaymentMethodId
  sessionId: string
  recipient: string
  funding: PaymentAmount
  remaining: PaymentAmount
  requestHash: string
  createdAt: string
  expiresAt: string
  status: 'active' | 'closed' | 'expired'
}

export interface PaymentVerificationResult {
  ok: boolean
  reason?: string
  challenge?: PaymentChallenge
  credential?: PaymentCredential
  receipt?: PaymentReceipt
}

export interface PaymentMethod {
  id: PaymentMethodId
  name: string
  protocols: PaymentProtocol[]
  createChallenge(input: PaymentChallengeInput): PaymentChallenge
  createCredential(input: PaymentCredentialInput): PaymentCredential
  verifyCredential(challenge: PaymentChallenge, credential: PaymentCredential): PaymentVerificationResult
  createReceipt(challenge: PaymentChallenge, credential: PaymentCredential, reference: string): PaymentReceipt
}

export function createEmptySessionAmount(asset: PaymentAsset): PaymentAmount {
  return { amount: '0', asset }
}

export function cloneAmount(amount: PaymentAmount): PaymentAmount {
  return { amount: amount.amount, asset: amount.asset }
}

export function createPaymentChallengeId(): string {
  return randomUUID()
}

export function createPaymentCredentialId(): string {
  return randomUUID()
}

export function createPaymentReceiptId(): string {
  return randomUUID()
}

export function createPaymentSessionId(): string {
  return randomUUID()
}
