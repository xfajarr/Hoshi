import type { HoshiConfig } from './core/types.js'
import { HoshiConfigSchema } from './core/types.js'

export function createConfig(overrides?: Partial<HoshiConfig>): HoshiConfig {
  return HoshiConfigSchema.parse({
    ...overrides
  })
}

export const DEFAULT_CONFIG: HoshiConfig = {
  rpcEndpoint: 'https://api.devnet.solana.com',
  commitment: 'confirmed',
  jupiterApiUrl: 'https://quote-api.jup.ag/v6',
  usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
}
