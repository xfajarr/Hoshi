import { createPaymentChallenge, isPaymentChallengeExpired } from './challenge.js'
import { isPaymentCredentialExpired } from './credential.js'
import { closePaymentSession, createPaymentSession, isPaymentSessionExpired, topUpPaymentSession } from './session.js'
import { createPaymentMethodRegistry, type PaymentMethodRegistry } from './registry.js'
import type { PaymentAmount, PaymentChallenge, PaymentCredential, PaymentReceipt, PaymentVerificationResult, SessionIntent } from './types.js'

export interface CreatePaymentCoreOptions {
  registry?: PaymentMethodRegistry
}

export interface PaymentCore {
  registry: PaymentMethodRegistry
  createChallenge(input: Parameters<typeof createPaymentChallenge>[0]): PaymentChallenge
  createCredential(challenge: PaymentChallenge, payload: Record<string, unknown>): PaymentCredential
  verifyCredential(credential: PaymentCredential): PaymentVerificationResult
  createReceipt(credential: PaymentCredential, reference: string): PaymentReceipt
  createSession(input: Parameters<typeof createPaymentSession>[0]): SessionIntent
  topUpSession(sessionId: string, amount: PaymentAmount): SessionIntent
  closeSession(sessionId: string): SessionIntent
  getChallenge(challengeId: string): PaymentChallenge | null
  getSession(sessionId: string): SessionIntent | null
}

export function createPaymentCore(options: CreatePaymentCoreOptions = {}): PaymentCore {
  const registry = options.registry ?? createPaymentMethodRegistry()
  const challenges = new Map<string, PaymentChallenge>()
  const sessions = new Map<string, SessionIntent>()

  const verifyCredential = (credential: PaymentCredential): PaymentVerificationResult => {
    const challenge = challenges.get(credential.challengeId)
    if (!challenge) {
      return { ok: false, reason: 'challenge_missing', credential }
    }

    if (isPaymentChallengeExpired(challenge)) {
      challenge.status = 'expired'
      return { ok: false, reason: 'challenge_expired', challenge, credential }
    }

    if (isPaymentCredentialExpired(credential)) {
      return { ok: false, reason: 'credential_expired', challenge, credential }
    }

    const method = registry.get(challenge.method)
    if (!method) {
      return { ok: false, reason: 'method_unsupported', challenge, credential }
    }

    const result = method.verifyCredential(challenge, credential)
    if (!result.ok) return result

    challenge.status = 'verified'
    return { ok: true, challenge, credential }
  }

  return {
    registry,
    createChallenge(input) {
      const method = registry.get(input.method)
      if (!method) throw new Error('PAYMENT_METHOD_UNSUPPORTED')
      const challenge = method.createChallenge(input)
      challenges.set(challenge.challengeId, challenge)
      return challenge
    },
    createCredential(challenge, payload) {
      const method = registry.get(challenge.method)
      if (!method) throw new Error('PAYMENT_METHOD_UNSUPPORTED')
      return method.createCredential({ challenge, payload })
    },
    verifyCredential,
    createReceipt(credential, reference) {
      const result = verifyCredential(credential)
      if (!result.ok || !result.challenge) {
        throw new Error(result.reason ?? 'VERIFICATION_FAILED')
      }
      const method = registry.get(result.challenge.method)
      if (!method) throw new Error('PAYMENT_METHOD_UNSUPPORTED')
      return method.createReceipt(result.challenge, credential, reference)
    },
    createSession(input) {
      const session = createPaymentSession(input)
      sessions.set(session.sessionId, session)
      return session
    },
    topUpSession(sessionId, amount) {
      const session = sessions.get(sessionId)
      if (!session) throw new Error('SESSION_MISSING')
      if (isPaymentSessionExpired(session)) {
        session.status = 'expired'
        throw new Error('SESSION_EXPIRED')
      }
      const updated = topUpPaymentSession(session, amount)
      sessions.set(sessionId, updated)
      return updated
    },
    closeSession(sessionId) {
      const session = sessions.get(sessionId)
      if (!session) throw new Error('SESSION_MISSING')
      const updated = closePaymentSession(session)
      sessions.set(sessionId, updated)
      return updated
    },
    getChallenge(challengeId) {
      return challenges.get(challengeId) ?? null
    },
    getSession(sessionId) {
      return sessions.get(sessionId) ?? null
    },
  }
}
