import type { Transaction } from '@solana/web3.js'
import type { Result } from '../core/result.js'
import type { HoshiSDKError } from '../core/errors.js'

/**
 * SignerPort abstracts transaction signing.
 * Implementations can use keypairs, hardware wallets, or external signers.
 */
export interface SignerPort {
  readonly publicKey: string
  
  /**
   * Sign a transaction and return the fully signed transaction.
   */
  signTransaction(transaction: Transaction): Promise<Result<Transaction, HoshiSDKError>>
  
  /**
   * Sign and send a transaction in one step.
   * Returns the transaction signature.
   */
  signAndSendTransaction(
    transaction: Transaction,
    sendRawTransaction: (rawTx: Uint8Array) => Promise<string>
  ): Promise<Result<string, HoshiSDKError>>
}
