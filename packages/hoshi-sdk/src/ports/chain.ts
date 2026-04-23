import type { PublicKey, Transaction, Commitment } from '@solana/web3.js'
import type { Result } from '../core/result.js'
import type { HoshiSDKError } from '../core/errors.js'
import type { Balance } from '../core/types.js'

export interface ChainPort {
  readonly rpcEndpoint: string
  readonly commitment: Commitment

  // Connection lifecycle
  connect(): Promise<Result<void, HoshiSDKError>>
  disconnect(): Promise<Result<void, HoshiSDKError>>
  isConnected(): boolean

  // Account queries
  getBalance(pubkey: PublicKey): Promise<Result<bigint, HoshiSDKError>>
  getTokenBalance(owner: PublicKey, mint: PublicKey): Promise<Result<bigint, HoshiSDKError>>
  getBalances(owner: PublicKey): Promise<Result<Balance[], HoshiSDKError>>
  getAccountInfo(pubkey: PublicKey): Promise<Result<unknown, HoshiSDKError>>

  // Transaction operations
  getLatestBlockhash(): Promise<Result<string, HoshiSDKError>>
  sendTransaction(transaction: Transaction): Promise<Result<string, HoshiSDKError>>
  sendRawTransaction(rawTransaction: Uint8Array): Promise<Result<string, HoshiSDKError>>
  simulateTransaction(transaction: Transaction): Promise<Result<unknown, HoshiSDKError>>
  confirmTransaction(signature: string): Promise<Result<void, HoshiSDKError>>

  // SPL Token operations
  createTransferInstruction(params: {
    from: PublicKey
    to: PublicKey
    mint: PublicKey
    amount: bigint
    decimals: number
    owner: PublicKey
  }): Promise<Result<Transaction, HoshiSDKError>>

  getAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): Promise<Result<PublicKey, HoshiSDKError>>
  createAssociatedTokenAccount(owner: PublicKey, mint: PublicKey, payer: PublicKey): Promise<Result<Transaction, HoshiSDKError>>
}
