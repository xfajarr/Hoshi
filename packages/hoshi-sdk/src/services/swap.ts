import type { StoragePort } from '../ports/storage.js'
import type { SwapProviderPort } from '../ports/swap-provider.js'
import type { Result } from '../core/result.js'
import { Result as R } from '../core/result.js'
import type { SwapQuote, Receipt } from '../core/types.js'
import { NotFoundError, ProviderError, HoshiSDKError } from '../core/errors.js'

export interface GetQuoteInput {
  inputMint: string
  outputMint: string
  amount: string
  slippageBps?: number
}

export interface ExecuteSwapInput {
  walletId: string
  quoteId: string
}

export class SwapService {
  constructor(
    private readonly storage: StoragePort,
    private readonly swapProvider: SwapProviderPort
  ) {}

  async getQuote(input: GetQuoteInput): Promise<Result<SwapQuote, HoshiSDKError>> {
    return this.swapProvider.getQuote({
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      amount: input.amount,
      slippageBps: input.slippageBps
    })
  }

  async executeSwap(input: ExecuteSwapInput): Promise<Result<Receipt, NotFoundError | ProviderError>> {
    const walletResult = await this.storage.getWallet(input.walletId)
    if (!walletResult.ok) return walletResult
    if (!walletResult.value) {
      return R.err(new NotFoundError('Wallet', input.walletId))
    }

    const wallet = walletResult.value

    // Note: In a real implementation, you'd look up the quote from storage
    // For now, return a receipt indicating the swap needs to be built
    const receipt: Receipt = {
      id: crypto.randomUUID(),
      actionType: 'swap.execute',
      walletId: wallet.id,
      status: 'success',
      description: `Swap execution prepared for wallet ${wallet.publicKey}`,
      timestamp: new Date().toISOString(),
      metadata: {
        walletPublicKey: wallet.publicKey,
        quoteId: input.quoteId,
        note: 'Use JupiterSwapAdapter.buildSwapTransaction to get the actual transaction'
      }
    }

    await this.storage.saveReceipt(receipt)
    return R.ok(receipt)
  }
}
