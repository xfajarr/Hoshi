// Core
export * from './core/result.js'
export * from './core/errors.js'
export * from './core/types.js'

// Ports
export * from './ports/storage.js'
export * from './ports/chain.js'
export * from './ports/signer.js'
export * from './ports/swap-provider.js'
export * from './ports/yield-provider.js'

// Adapters
export * from './adapters/solana/connection.js'
export * from './adapters/solana/keypair-signer.js'
export * from './adapters/solana/encrypted-keypair-vault.js'
export * from './adapters/jupiter/client.js'
export * from './adapters/kamino/client.js'
export * from './adapters/memory/storage.js'

// Services
export * from './services/wallet.js'
export * from './services/transfer.js'
export * from './services/invoice.js'
export * from './services/swap.js'
export * from './services/yield.js'

// Config
export * from './config.js'

// Token Registry & Constants (from t2000 SDK)
export * from './constants.js'
export * from './token-registry.js'

// Contacts Manager (from t2000 SDK)
export * from './contacts.js'

// Safeguards/Enforcer (from t2000 SDK)
export * from './safeguards/index.js'

// Signer utilities
export * from './signer.js'

// Swap quote utilities
export * from './swap-quote.js'

// Payments
export * from './payments/types.js'
export * from './payments/x402.js'
export * from './payments/mpp.js'

// Wallet utilities
export * from './wallet/index.js'

// KYA primitives
export * from './kya/index.js'

// Browser wallet detection
export * from './browser.js'

// Main SDK class
export {
  Hoshi,
  createHoshi,
} from './hoshi.js'
export type { CreateWalletInput, HoshiOptions } from './hoshi.js'
