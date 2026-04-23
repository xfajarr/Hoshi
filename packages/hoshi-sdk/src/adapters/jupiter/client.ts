import type { SwapProviderPort } from '../../ports/swap-provider.js'
import type { Result } from '../../core/result.js'
import { Result as R } from '../../core/result.js'
import { ProviderError } from '../../core/errors.js'
import type { SwapQuote } from '../../core/types.js'
import { PublicKey, Transaction } from '@solana/web3.js'

interface JupiterQuoteResponse {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: string
  slippageBps: number
  platformFee?: { amount: string; feeBps: number }
  priceImpactPct: string
  routePlan: Array<{
    swapInfo: {
      ammKey: string
      label: string
      inputMint: string
      outputMint: string
      inAmount: string
      outAmount: string
      feeAmount: string
      feeMint: string
    }
    percent: number
  }>
  contextSlot?: number
  timeTaken?: number
}

interface JupiterSwapResponse {
  swapTransaction: string
}

export class JupiterSwapAdapter implements SwapProviderPort {
  readonly name = 'Jupiter'
  
  constructor(public readonly apiUrl: string = 'https://api.jup.ag/swap/v1') {}

  async getQuote(params: {
    inputMint: string
    outputMint: string
    amount: string
    slippageBps?: number
    swapMode?: 'ExactIn' | 'ExactOut'
  }): Promise<Result<SwapQuote, ProviderError>> {
    try {
      const searchParams = new URLSearchParams({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: (params.slippageBps || 50).toString(),
        swapMode: params.swapMode || 'ExactIn'
      })

      const response = await fetch(`${this.apiUrl}/quote?${searchParams.toString()}`)
      
      if (!response.ok) {
        const error = await response.text()
        return R.err(new ProviderError('Jupiter', `API error: ${response.status} - ${error}`))
      }

      const data = await response.json() as JupiterQuoteResponse

      const quote: SwapQuote = {
        id: crypto.randomUUID(),
        inputMint: data.inputMint,
        outputMint: data.outputMint,
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        otherAmountThreshold: data.otherAmountThreshold,
        swapMode: (data.swapMode as 'ExactIn' | 'ExactOut') || 'ExactIn',
        slippageBps: data.slippageBps,
        platformFee: data.platformFee ? Number(data.platformFee.feeBps) : undefined,
        priceImpactPct: data.priceImpactPct,
        routePlan: data.routePlan,
        contextSlot: data.contextSlot,
        timeTaken: data.timeTaken,
        expiry: new Date(Date.now() + 30 * 1000).toISOString() // 30s expiry
      }

      return R.ok(quote)
    } catch (err) {
      return R.err(new ProviderError('Jupiter', `Failed to get quote: ${String(err)}`))
    }
  }

  async buildSwapTransaction(params: {
    quote: SwapQuote
    userPublicKey: PublicKey
    wrapUnwrapSOL?: boolean
    feeAccount?: string
  }): Promise<Result<Transaction, ProviderError>> {
    try {
      const body: Record<string, unknown> = {
        quoteResponse: {
          inputMint: params.quote.inputMint,
          outputMint: params.quote.outputMint,
          inAmount: params.quote.inAmount,
          outAmount: params.quote.outAmount,
          otherAmountThreshold: params.quote.otherAmountThreshold,
          swapMode: params.quote.swapMode,
          slippageBps: params.quote.slippageBps,
          priceImpactPct: params.quote.priceImpactPct,
          routePlan: params.quote.routePlan
        },
        userPublicKey: params.userPublicKey.toBase58(),
        wrapAndUnwrapSol: params.wrapUnwrapSOL ?? true,
        prioritizationFeeLamports: 'auto'
      }

      if (params.feeAccount) {
        body.feeAccount = params.feeAccount
      }

      const response = await fetch(`${this.apiUrl}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.text()
        return R.err(new ProviderError('Jupiter', `Swap API error: ${response.status} - ${error}`))
      }

      const data = await response.json() as JupiterSwapResponse
      
      // Deserialize the transaction
      const transactionBuffer = Buffer.from(data.swapTransaction, 'base64')
      const transaction = Transaction.from(transactionBuffer)

      return R.ok(transaction)
    } catch (err) {
      return R.err(new ProviderError('Jupiter', `Failed to build swap: ${String(err)}`))
    }
  }

  async getSupportedTokens(): Promise<Result<string[], ProviderError>> {
    try {
      // Jupiter doesn't have a simple token list endpoint in v6
      // Return common tokens
      return R.ok([
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'So11111111111111111111111111111111111111112',  // Wrapped SOL
      ])
    } catch (err) {
      return R.err(new ProviderError('Jupiter', `Failed to get tokens: ${String(err)}`))
    }
  }
}
