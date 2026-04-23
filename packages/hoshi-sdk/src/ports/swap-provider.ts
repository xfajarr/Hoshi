import type { Result } from '../core/result.js'
import type { HoshiSDKError } from '../core/errors.js'
import type { SwapQuote } from '../core/types.js'
import type { PublicKey, Transaction } from '@solana/web3.js'

export interface SwapProviderPort {
  readonly name: string
  readonly apiUrl: string

  getQuote(params: {
    inputMint: string
    outputMint: string
    amount: string
    slippageBps?: number
    swapMode?: 'ExactIn' | 'ExactOut'
  }): Promise<Result<SwapQuote, HoshiSDKError>>

  buildSwapTransaction(params: {
    quote: SwapQuote
    userPublicKey: PublicKey
    wrapUnwrapSOL?: boolean
    feeAccount?: string
  }): Promise<Result<Transaction, HoshiSDKError>>

  getSupportedTokens(): Promise<Result<string[], HoshiSDKError>>
}
