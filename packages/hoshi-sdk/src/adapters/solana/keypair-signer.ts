import { Keypair, Transaction } from '@solana/web3.js'
import type { SignerPort } from '../../ports/signer.js'
import type { Result } from '../../core/result.js'
import { Result as R } from '../../core/result.js'
import { ValidationError } from '../../core/errors.js'
import { readFileSync } from 'fs'

/**
 * KeypairSigner loads a Solana keypair from a file and implements SignerPort.
 * Compatible with Solana CLI keypair JSON format (array of bytes or base58 string).
 */
export class KeypairSigner implements SignerPort {
  readonly publicKey: string
  private keypair: Keypair

  constructor(keypair: Keypair) {
    this.keypair = keypair
    this.publicKey = keypair.publicKey.toBase58()
  }

  static fromFile(path: string): KeypairSigner {
    const content = readFileSync(path, 'utf-8')
    let secretKey: Uint8Array

    try {
      // Try JSON array format first (Solana CLI default)
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        secretKey = new Uint8Array(parsed)
      } else if (typeof parsed === 'string') {
        // Base58 encoded keypair
        const { bs58 } = require('@solana/web3.js')
        secretKey = bs58.decode(parsed)
      } else {
        throw new Error('Invalid keypair format')
      }
    } catch {
      // Try base58 string directly
      const { bs58 } = require('@solana/web3.js')
      secretKey = bs58.decode(content.trim())
    }

    return new KeypairSigner(Keypair.fromSecretKey(secretKey))
  }

  static fromBase58(base58Key: string): KeypairSigner {
    const { bs58 } = require('@solana/web3.js')
    const secretKey = bs58.decode(base58Key)
    return new KeypairSigner(Keypair.fromSecretKey(secretKey))
  }

  static fromEnvironment(varName: string = 'HOSHI_PRIVATE_KEY'): KeypairSigner | null {
    const key = process.env[varName]
    if (!key) return null
    return KeypairSigner.fromBase58(key)
  }

  async signTransaction(transaction: Transaction): Promise<Result<Transaction, ValidationError>> {
    try {
      transaction.partialSign(this.keypair)
      return R.ok(transaction)
    } catch (err) {
      return R.err(new ValidationError('Failed to sign transaction', { 
        error: err instanceof Error ? err.message : String(err) 
      }))
    }
  }

  async signAndSendTransaction(
    transaction: Transaction,
    sendRawTransaction: (rawTx: Uint8Array) => Promise<string>
  ): Promise<Result<string, ValidationError>> {
    const signResult = await this.signTransaction(transaction)
    if (!signResult.ok) return signResult

    try {
      const rawTx = signResult.value.serialize()
      const signature = await sendRawTransaction(rawTx)
      return R.ok(signature)
    } catch (err) {
      return R.err(new ValidationError('Failed to send signed transaction', {
        error: err instanceof Error ? err.message : String(err)
      }))
    }
  }
}
