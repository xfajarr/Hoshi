import { z } from 'zod'
import { PublicKey } from '@solana/web3.js'

// Asset types
export const AssetSchema = z.enum(['USDC', 'SOL'])
export type Asset = z.infer<typeof AssetSchema>

// Money value object
export const MoneySchema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid decimal string'),
  asset: AssetSchema
})
export type Money = z.infer<typeof MoneySchema>

// Wallet domain entity
export const WalletSchema = z.object({
  id: z.string().uuid(),
  publicKey: z.string().refine((val) => {
    try { new PublicKey(val); return true } catch { return false }
  }, 'Invalid Solana public key'),
  label: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})
export type Wallet = z.infer<typeof WalletSchema>

// Action types
export const ActionTypeSchema = z.enum([
  'balance.read',
  'transfer.send',
  'transfer.receive',
  'invoice.create',
  'invoice.read',
  'payment_link.create',
  'payment_link.read',
  'swap.quote',
  'swap.execute',
  'yield.deposit',
  'yield.withdraw',
  'yield.read',
  'history.read'
])
export type ActionType = z.infer<typeof ActionTypeSchema>

export const ActionCategorySchema = z.enum(['read', 'write_safe', 'write_escalated'])
export type ActionCategory = z.infer<typeof ActionCategorySchema>

// Receipt value object
export const ReceiptSchema = z.object({
  id: z.string().uuid(),
  actionType: ActionTypeSchema,
  walletId: z.string().uuid(),
  status: z.enum(['pending', 'success', 'failed', 'pending_approval']),
  amount: MoneySchema.optional(),
  fee: MoneySchema.optional(),
  description: z.string(),
  signature: z.string().optional(),
  timestamp: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional()
})
export type Receipt = z.infer<typeof ReceiptSchema>

// Invoice entity
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  amount: MoneySchema,
  description: z.string(),
  status: z.enum(['pending', 'paid', 'expired', 'cancelled']),
  paymentLink: z.string().url(),
  externalId: z.string().optional(),
  createdAt: z.string(),
  paidAt: z.string().optional(),
  expiresAt: z.string().optional()
})
export type Invoice = z.infer<typeof InvoiceSchema>

// Payment Link entity
export const PaymentLinkSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  amount: MoneySchema,
  description: z.string(),
  url: z.string().url(),
  status: z.enum(['active', 'inactive', 'expired']),
  externalId: z.string().optional(),
  createdAt: z.string(),
  expiresAt: z.string().optional()
})
export type PaymentLink = z.infer<typeof PaymentLinkSchema>

// Swap Quote value object
export const SwapQuoteSchema = z.object({
  id: z.string().uuid(),
  inputMint: z.string(),
  outputMint: z.string(),
  inAmount: z.string(),
  outAmount: z.string(),
  otherAmountThreshold: z.string(),
  swapMode: z.enum(['ExactIn', 'ExactOut']),
  slippageBps: z.number(),
  platformFee: z.number().optional(),
  priceImpactPct: z.string(),
  routePlan: z.array(z.object({
    swapInfo: z.object({
      ammKey: z.string(),
      label: z.string(),
      inputMint: z.string(),
      outputMint: z.string(),
      inAmount: z.string(),
      outAmount: z.string(),
      feeAmount: z.string(),
      feeMint: z.string()
    }),
    percent: z.number()
  })),
  contextSlot: z.number().optional(),
  timeTaken: z.number().optional(),
  expiry: z.string()
})
export type SwapQuote = z.infer<typeof SwapQuoteSchema>

// Yield Position entity
export const YieldPositionSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  protocol: z.string(),
  strategy: z.string(),
  deposited: MoneySchema,
  currentValue: MoneySchema,
  apy: z.string(),
  status: z.enum(['active', 'withdrawing', 'closed']),
  signature: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})
export type YieldPosition = z.infer<typeof YieldPositionSchema>

// Balance snapshot
export const BalanceSchema = z.object({
  asset: AssetSchema,
  amount: z.string(),
  decimals: z.number(),
  usdValue: z.string().optional()
})
export type Balance = z.infer<typeof BalanceSchema>

// Action request
export const ActionRequestSchema = z.object({
  id: z.string().uuid(),
  type: ActionTypeSchema,
  walletId: z.string().uuid(),
  params: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
  requester: z.string().optional()
})
export type ActionRequest = z.infer<typeof ActionRequestSchema>

// Configuration
export const HoshiConfigSchema = z.object({
  rpcEndpoint: z.string().url().default('https://api.devnet.solana.com'),
  commitment: z.enum(['processed', 'confirmed', 'finalized']).default('confirmed'),
  jupiterApiUrl: z.string().url().default('https://quote-api.jup.ag/v6'),
  kaminoApiUrl: z.string().url().optional(),
  usdcMint: z.string().default('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  wsEndpoint: z.string().optional()
})
export type HoshiConfig = z.infer<typeof HoshiConfigSchema>
