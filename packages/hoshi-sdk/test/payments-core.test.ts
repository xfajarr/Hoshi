import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  Hoshi,
  InMemoryStorageAdapter,
  closePaymentSession,
  createPaymentChallenge,
  createPaymentCore,
  createPaymentCredential,
  createPaymentReceipt,
  createPaymentSession,
  isPaymentChallengeExpired,
  isPaymentCredentialExpired,
  isPaymentSessionExpired,
  topUpPaymentSession,
} from '../src/index.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('shared payment core', () => {
  it('creates linked payment challenge, credential, and receipt records', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const challenge = createPaymentChallenge({
      protocol: 'x402',
      intent: 'charge',
      method: 'solana',
      resource: 'https://pay.hoshi.ai/i/abc',
      amount: { amount: '12.5', asset: 'USDC' },
      recipient: 'wallet-1',
      requestHash: 'invoice-1',
      expiresInSeconds: 60,
    })

    expect(challenge).toMatchObject({
      protocol: 'x402',
      intent: 'charge',
      method: 'solana',
      resource: 'https://pay.hoshi.ai/i/abc',
      amount: { amount: '12.5', asset: 'USDC' },
      recipient: 'wallet-1',
      requestHash: 'invoice-1',
      status: 'pending',
    })
    expect(isPaymentChallengeExpired(challenge)).toBe(false)

    const credential = createPaymentCredential({
      challenge,
      payload: { txSignature: 'sig-1' },
      expiresInSeconds: 120,
    })

    expect(credential).toMatchObject({
      challengeId: challenge.challengeId,
      protocol: 'x402',
      intent: 'charge',
      method: 'solana',
      requestHash: 'invoice-1',
      payload: { txSignature: 'sig-1' },
    })
    expect(isPaymentCredentialExpired(credential)).toBe(false)

    const receipt = createPaymentReceipt(challenge, credential, 'invoice-1')
    expect(receipt).toMatchObject({
      challengeId: challenge.challengeId,
      protocol: 'x402',
      intent: 'charge',
      method: 'solana',
      requestHash: 'invoice-1',
      amount: { amount: '12.5', asset: 'USDC' },
      recipient: 'wallet-1',
      reference: 'invoice-1',
    })
  })

  it('manages mpp sessions without mutating the original funding amount', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const funding = { amount: '3', asset: 'SOL' as const }
    const session = createPaymentSession({
      protocol: 'mpp',
      method: 'solana',
      recipient: 'wallet-2',
      funding,
      requestHash: 'payment-link-1',
      expiresInSeconds: 60,
    })

    expect(session).toMatchObject({
      kind: 'session',
      protocol: 'mpp',
      method: 'solana',
      recipient: 'wallet-2',
      funding: { amount: '3', asset: 'SOL' },
      remaining: { amount: '3', asset: 'SOL' },
      requestHash: 'payment-link-1',
      status: 'active',
    })
    expect(session.funding).not.toBe(funding)
    expect(session.remaining).not.toBe(funding)
    expect(isPaymentSessionExpired(session)).toBe(false)

    const toppedUp = topUpPaymentSession(session, { amount: '0.5', asset: 'SOL' })
    expect(toppedUp.remaining).toEqual({ amount: '3.5', asset: 'SOL' })

    const closed = closePaymentSession(toppedUp)
    expect(closed.status).toBe('closed')
  })

  it('supports protocol-complete core flows from the public export surface', () => {
    const core = createPaymentCore()
    expect(core.registry.list().map(method => method.id)).toEqual(['solana'])

    const challenge = core.createChallenge({
      protocol: 'mpp',
      intent: 'charge',
      method: 'solana',
      resource: 'https://pay.hoshi.ai/p/abc',
      amount: { amount: '1', asset: 'SOL' },
      recipient: 'wallet-3',
      requestHash: 'payment-link-2',
      expiresInSeconds: 300,
    })

    const credential = core.createCredential(challenge, { txSignature: 'sig-2' })
    const verification = core.verifyCredential(credential)
    expect(verification.ok).toBe(true)

    const receipt = core.createReceipt(credential, 'payment-link-2')
    expect(receipt.reference).toBe('payment-link-2')

    const session = core.createSession({
      protocol: 'mpp',
      method: 'solana',
      recipient: 'wallet-3',
      funding: { amount: '1', asset: 'SOL' },
      requestHash: 'payment-link-2',
      expiresInSeconds: 300,
    })

    expect(core.getChallenge(challenge.challengeId)?.challengeId).toBe(challenge.challengeId)
    expect(core.getSession(session.sessionId)?.sessionId).toBe(session.sessionId)
  })



  it('exposes the shared payment core through the Hoshi SDK facade', () => {
    const hoshi = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const challenge = hoshi.createPaymentChallenge({
      protocol: 'x402',
      intent: 'charge',
      method: 'solana',
      resource: 'GET /premium',
      amount: { amount: '1', asset: 'USDC' },
      recipient: 'wallet-5',
      requestHash: 'challenge-5',
      expiresInSeconds: 60,
    })

    expect(challenge.protocol).toBe('x402')
    const credential = hoshi.createPaymentCredential(challenge, { txSignature: 'sig-5' })
    const verification = hoshi.verifyPaymentCredential(credential)
    expect(verification.ok).toBe(true)
    const receipt = hoshi.createPaymentReceipt(credential, 'challenge-5')
    expect(receipt.reference).toBe('challenge-5')

    const session = hoshi.createSession({
      protocol: 'mpp',
      method: 'solana',
      recipient: 'wallet-5',
      funding: { amount: '2', asset: 'SOL' },
      requestHash: 'session-5',
      expiresInSeconds: 120,
    })
    expect(session.status).toBe('active')
  })

  it('marks expired challenges and sessions as expired', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const challenge = createPaymentChallenge({
      protocol: 'x402',
      intent: 'charge',
      method: 'solana',
      resource: 'https://pay.hoshi.ai/i/expired',
      amount: { amount: '1', asset: 'USDC' },
      recipient: 'wallet-4',
      requestHash: 'invoice-expired',
      expiresInSeconds: 0,
    })
    expect(isPaymentChallengeExpired(challenge)).toBe(true)

    const session = createPaymentSession({
      protocol: 'mpp',
      method: 'solana',
      recipient: 'wallet-4',
      funding: { amount: '1', asset: 'USDC' },
      requestHash: 'payment-link-expired',
      expiresInSeconds: 0,
    })

    expect(isPaymentSessionExpired(session)).toBe(true)
  })
})
