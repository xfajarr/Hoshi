import { Keypair } from '@solana/web3.js'
import { KeypairSigner } from './adapters/solana/keypair-signer.js'
import type { SignerPort } from './ports/signer.js'
import type { Result } from './core/result.js'
import { Result as R } from './core/result.js'
import { ValidationError } from './core/errors.js'

export { KeypairSigner }

export interface SignerIdentity {
  publicKey: string
  signer: SignerPort
}

export function isKeypairSigner(signer: unknown): signer is KeypairSigner {
  return signer instanceof KeypairSigner
}

export function createRandomSigner(): { signer: KeypairSigner; publicKey: string } {
  const keypair = Keypair.generate()
  const signer = new KeypairSigner(keypair)
  return { signer, publicKey: signer.publicKey }
}

export function createSignerFromBytes(secretKeyBytes: Uint8Array): KeypairSigner {
  const keypair = Keypair.fromSecretKey(secretKeyBytes)
  return new KeypairSigner(keypair)
}

export function createSignerFromBase58(base58Key: string): KeypairSigner {
  return KeypairSigner.fromBase58(base58Key)
}

export function createSignerFromFile(path: string): KeypairSigner {
  return KeypairSigner.fromFile(path)
}

export function validatePublicKey(publicKey: string): boolean {
  try {
    const { PublicKey } = require('@solana/web3.js')
    new PublicKey(publicKey)
    return true
  } catch {
    return false
  }
}

export async function signMessage(
  signer: SignerPort,
  message: string | Uint8Array
): Promise<Result<Uint8Array, ValidationError>> {
  try {
    const encoded = typeof message === 'string' ? new TextEncoder().encode(message) : message
    const { PublicKey, Transaction } = require('@solana/web3.js')
    const dummyTx = new Transaction()
    dummyTx.add({
      keys: [],
      programId: new PublicKey('11111111111111111111111111111111'),
      data: encoded
    })
    const result = await signer.signTransaction(dummyTx)
    if (!result.ok) return R.err(result.error)
    return R.ok(encoded)
  } catch (err) {
    return R.err(new ValidationError('Failed to sign message', {
      error: err instanceof Error ? err.message : String(err)
    }))
  }
}

export async function verifySignature(
  publicKey: string,
  message: string | Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  try {
    const { PublicKey } = require('@solana/web3.js')
    const pubKey = new PublicKey(publicKey)
    const encoded = typeof message === 'string' ? new TextEncoder().encode(message) : message
    return pubKey.verify(signature, encoded)
  } catch {
    return false
  }
}

export { KeypairSigner as HoshiSigner } from './adapters/solana/keypair-signer.js'
