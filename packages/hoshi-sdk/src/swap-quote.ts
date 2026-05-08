import type { SwapQuote } from './core/types.js'
import { JupiterSwapAdapter } from './adapters/jupiter/client.js'
import { resolveSymbol, resolveTokenMint } from './token-registry.js'
import type { Result } from './core/result.js'
import { Result as R } from './core/result.js'
import { ProviderError } from './core/errors.js'

export { JupiterSwapAdapter as SwapQuoteProvider }

export interface SwapQuoteInput {
  inputMint: string
  outputMint: string
  amount: string
  slippageBps?: number
  swapMode?: 'ExactIn' | 'ExactOut'
}

export interface SwapQuoteOutput {
  quote: SwapQuote
  inputSymbol: string
  outputSymbol: string
  inputDecimals: number
  outputDecimals: number
  usdValue?: string
  routes: string[]
  expiresAt: Date
}

export function parseSwapQuote(quote: SwapQuote): SwapQuoteOutput {
  return {
    quote,
    inputSymbol: resolveSymbol(quote.inputMint),
    outputSymbol: resolveSymbol(quote.outputMint),
    inputDecimals: 9,
    outputDecimals: 9,
    routes: quote.routePlan.map(r => r.swapInfo.label),
    expiresAt: new Date(quote.expiry)
  }
}

export function formatSwapQuote(quote: SwapQuote): {
  from: { symbol: string; amount: string; usd?: string }
  to: { symbol: string; amount: string; usd?: string }
  slippage: string
  impact: string
  routes: string[]
} {
  const parsed = parseSwapQuote(quote)
  return {
    from: {
      symbol: parsed.inputSymbol,
      amount: formatAmount(quote.inAmount, parsed.inputDecimals)
    },
    to: {
      symbol: parsed.outputSymbol,
      amount: formatAmount(quote.outAmount, parsed.outputDecimals)
    },
    slippage: `${quote.slippageBps / 100}%`,
    impact: `${quote.priceImpactPct}%`,
    routes: parsed.routes
  }
}

function formatAmount(lamports: string, decimals: number): string {
  const value = BigInt(lamports) / BigInt(10 ** decimals)
  const remainder = BigInt(lamports) % BigInt(10 ** decimals)
  const decimalStr = remainder.toString().padStart(decimals, '0').slice(0, 4)
  return `${value}.${decimalStr.replace(/0+$/, '')}`
}

export async function getQuickQuote(
  inputSymbol: string,
  outputSymbol: string,
  amount: string,
  slippageBps = 50
): Promise<Result<SwapQuoteOutput, ProviderError>> {
  const jupiter = new JupiterSwapAdapter()

  const inputMint = resolveTokenMint(inputSymbol)
  const outputMint = resolveTokenMint(outputSymbol)

  if (!inputMint) return R.err(new ProviderError('SwapQuote', `Unknown input token: ${inputSymbol}`))
  if (!outputMint) return R.err(new ProviderError('SwapQuote', `Unknown output token: ${outputSymbol}`))

  const result = await jupiter.getQuote({
    inputMint,
    outputMint,
    amount,
    slippageBps
  })

  if (!result.ok) return R.err(result.error)

  return R.ok(parseSwapQuote(result.value))
}

export function isQuoteExpired(quote: SwapQuote): boolean {
  return new Date(quote.expiry) < new Date()
}

export function getMinimumReceived(quote: SwapQuote): bigint {
  return BigInt(quote.otherAmountThreshold)
}

export function getExpectedOutput(quote: SwapQuote): bigint {
  return BigInt(quote.outAmount)
}

export function calculatePriceImpact(quote: SwapQuote): number {
  return parseFloat(quote.priceImpactPct)
}

export function isHighPriceImpact(quote: SwapQuote, threshold = 1.0): boolean {
  return calculatePriceImpact(quote) > threshold
}
