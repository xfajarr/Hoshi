import { createPaymentChallenge, isPaymentChallengeExpired } from './challenge.js'
import { bindCredentialToChallenge, isPaymentCredentialExpired } from './credential.js'
import { createPaymentReceipt } from './receipt.js'
import type { PaymentChallenge, PaymentCredential, PaymentMethod, PaymentVerificationResult } from './types.js'

function hasRequiredString(payload: Record<string, unknown>, key: string): boolean {
  return typeof payload[key] === 'string' && String(payload[key]).trim().length > 0
}

export function createSolanaPaymentMethod(): PaymentMethod {
  return {
    id: 'solana',
    name: 'Solana',
    protocols: ['x402', 'mpp'],
    createChallenge: (input) => createPaymentChallenge(input),
    createCredential: (input) => bindCredentialToChallenge(input.challenge, input.payload),
    verifyCredential(challenge: PaymentChallenge, credential: PaymentCredential): PaymentVerificationResult {
      if (isPaymentChallengeExpired(challenge)) {
        return { ok: false, reason: 'challenge_expired', challenge, credential }
      }

      if (isPaymentCredentialExpired(credential)) {
        return { ok: false, reason: 'credential_expired', challenge, credential }
      }

      if (credential.challengeId !== challenge.challengeId || credential.requestHash !== challenge.requestHash) {
        return { ok: false, reason: 'credential_mismatch', challenge, credential }
      }

      if (!hasRequiredString(credential.payload, 'txSignature')) {
        return { ok: false, reason: 'credential_malformed', challenge, credential }
      }

      return { ok: true, challenge, credential }
    },
    createReceipt(challenge, credential, reference) {
      return createPaymentReceipt(challenge, credential, reference)
    },
  }
}
