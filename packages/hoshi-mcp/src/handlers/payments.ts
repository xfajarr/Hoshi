import { z } from 'zod'
import { PublicKey } from '@solana/web3.js'
import type { MCPTool } from '../core/protocol.js'
import type { ServerContext } from '../core/server.js'

const readWallet = async (context: ServerContext, walletId: string) => {
  const result = await context.walletService.getById(walletId)
  if (!result.ok) throw new Error(result.error.message)
  if (!result.value) throw new Error('Wallet not found')
  return result.value
}

const asTool = (tool: MCPTool): MCPTool => tool

export function createPaymentTools(context: ServerContext): MCPTool[] {
  return [
    asTool({
      name: 'hoshi_balance',
      description: 'Get wallet balance for a specific asset (USDC or SOL)',
      inputSchema: z.object({
        walletId: z.string(),
        asset: z.enum(['USDC', 'SOL'])
      }),
      category: 'read',
      handler: async (args) => {
        const { walletId, asset } = args as { walletId: string; asset: 'USDC' | 'SOL' }
        const result = await context.walletService.getOnChainBalance(walletId, asset)
        if (!result.ok) throw new Error(result.error.message)
        return { balance: result.value, asset }
      }
    }),
    asTool({
      name: 'hoshi_balances',
      description: 'Get all balances for a wallet (SOL + all tokens)',
      inputSchema: z.object({
        walletId: z.string()
      }),
      category: 'read',
      handler: async (args) => {
        const { walletId } = args as { walletId: string }
        const wallet = await readWallet(context, walletId)
        const balancesResult = await context.walletService.getBalances(walletId)
        if (!balancesResult.ok) throw new Error(balancesResult.error.message)

        return {
          walletId,
          publicKey: wallet.publicKey,
          balances: balancesResult.value
        }
      }
    }),
    asTool({
      name: 'hoshi_wallet_info',
      description: 'Get wallet information including metadata',
      inputSchema: z.object({
        walletId: z.string()
      }),
      category: 'read',
      handler: async (args) => {
        const { walletId } = args as { walletId: string }
        const result = await context.walletService.getById(walletId)
        if (!result.ok) throw new Error(result.error.message)
        return { wallet: result.value }
      }
    }),
    asTool({
      name: 'hoshi_history',
      description: 'Get transaction receipts for a wallet',
      inputSchema: z.object({
        walletId: z.string(),
        limit: z.number().optional()
      }),
      category: 'read',
      handler: async (args) => {
        const { walletId, limit = 50 } = args as { walletId: string; limit?: number }
        const result = await context.storage.getReceipts(walletId)
        if (!result.ok) throw new Error(String(result.error))
        return {
          receipts: result.value.slice(0, limit),
          total: result.value.length
        }
      }
    }),
    asTool({
      name: 'hoshi_swap_quote',
      description: 'Get a swap quote from Jupiter (input amount in base units)',
      inputSchema: z.object({
        inputMint: z.string().describe('Input token mint address'),
        outputMint: z.string().describe('Output token mint address'),
        amount: z.string().describe('Input amount in base units (e.g., 1000000 for 1 USDC)'),
        slippageBps: z.number().optional().describe('Slippage tolerance in basis points (default: 50)')
      }),
      category: 'read',
      handler: async (args) => {
        const { inputMint, outputMint, amount, slippageBps } = args as {
          inputMint: string
          outputMint: string
          amount: string
          slippageBps?: number
        }
        const result = await context.swapService.getQuote({
          inputMint,
          outputMint,
          amount,
          slippageBps
        })
        if (!result.ok) throw new Error(result.error.message)
        return { quote: result.value }
      }
    }),
    asTool({
      name: 'hoshi_yield_strategies',
      description: 'List available yield strategies',
      inputSchema: z.object({}),
      category: 'read',
      handler: async () => {
        const result = await context.yieldService.getStrategies()
        if (!result.ok) throw new Error(result.error.message)
        return { strategies: result.value }
      }
    }),
    asTool({
      name: 'hoshi_yield_positions',
      description: 'Get yield positions for a wallet',
      inputSchema: z.object({
        walletId: z.string()
      }),
      category: 'read',
      handler: async (args) => {
        const { walletId } = args as { walletId: string }
        const result = await context.yieldService.getPositions(walletId)
        if (!result.ok) throw new Error(result.error.message)
        return { positions: result.value }
      }
    }),
    asTool({
      name: 'hoshi_create_invoice',
      description: 'Create a payment invoice',
      inputSchema: z.object({
        walletId: z.string(),
        amount: z.string(),
        asset: z.enum(['USDC', 'SOL']),
        description: z.string()
      }),
      category: 'write_safe',
      handler: async (args) => {
        const { walletId, amount, asset, description } = args as {
          walletId: string
          amount: string
          asset: 'USDC' | 'SOL'
          description: string
        }
        const result = await context.invoiceService.createInvoice({
          walletId,
          amount: { amount, asset },
          description
        })
        if (!result.ok) throw new Error(result.error.message)
        return { invoice: result.value }
      }
    }),
    asTool({
      name: 'hoshi_create_payment_link',
      description: 'Create a shareable payment link',
      inputSchema: z.object({
        walletId: z.string(),
        amount: z.string(),
        asset: z.enum(['USDC', 'SOL']),
        description: z.string()
      }),
      category: 'write_safe',
      handler: async (args) => {
        const { walletId, amount, asset, description } = args as {
          walletId: string
          amount: string
          asset: 'USDC' | 'SOL'
          description: string
        }
        const result = await context.invoiceService.createPaymentLink({
          walletId,
          amount: { amount, asset },
          description
        })
        if (!result.ok) throw new Error(result.error.message)
        return { link: result.value }
      }
    }),
    asTool({
      name: 'hoshi_wallet_create',
      description: 'Create a new treasury wallet (just the record, not on-chain)',
      inputSchema: z.object({
        publicKey: z.string().describe('Solana public key (base58)'),
        label: z.string().optional()
      }),
      category: 'write_safe',
      handler: async (args) => {
        const { publicKey, label } = args as { publicKey: string; label?: string }
        const result = await context.walletService.create({ publicKey, label })
        if (!result.ok) throw new Error(result.error.message)
        return { wallet: result.value }
      }
    }),
    asTool({
      name: 'hoshi_send',
      description: 'Send USDC or SOL to a recipient address. Requires signer for on-chain submission.',
      inputSchema: z.object({
        walletId: z.string(),
        to: z.string().describe('Recipient Solana address'),
        amount: z.string().describe('Amount to send'),
        asset: z.enum(['USDC', 'SOL']),
        submit: z.boolean().optional().describe('Submit transaction on-chain (requires signer)')
      }),
      category: 'write_escalated',
      handler: async (args) => {
        const { walletId, to, amount, asset, submit = false } = args as {
          walletId: string
          to: string
          amount: string
          asset: 'USDC' | 'SOL'
          submit?: boolean
        }

        if (submit && context.signer) {
          const wallet = await readWallet(context, walletId)
          if (wallet.publicKey !== context.signer.publicKey) {
            throw new Error(`Configured signer does not match wallet ${walletId}`)
          }

          const result = await context.transferService.sendSigned(
            { walletId, to, amount: { amount, asset } },
            context.signer
          )
          if (!result.ok) throw new Error(result.error.message)
          return {
            receipt: result.value,
            status: 'submitted',
            signature: result.value.metadata?.signature,
            explorerUrl: result.value.metadata?.explorerUrl
          }
        }

        const result = await context.transferService.buildTransferTransaction({
          walletId,
          to,
          amount: { amount, asset }
        })
        if (!result.ok) throw new Error(result.error.message)

        const blockhashResult = await context.chain.getLatestBlockhash()
        if (blockhashResult.ok) {
          result.value.transaction.recentBlockhash = blockhashResult.value
        }

        const wallet = await readWallet(context, walletId)
        result.value.transaction.feePayer = new PublicKey(wallet.publicKey)

        const serialized = result.value.transaction.serialize({ requireAllSignatures: false }).toString('base64')

        return {
          receipt: result.value.receipt,
          status: 'unsigned',
          serializedTransaction: serialized,
          message: 'Transaction built but not submitted. Set submit=true and provide a signer to submit on-chain.'
        }
      }
    }),
    asTool({
      name: 'hoshi_deposit_yield',
      description: 'Deposit to a yield strategy',
      inputSchema: z.object({
        walletId: z.string(),
        strategyId: z.string(),
        amount: z.string(),
        asset: z.enum(['USDC', 'SOL'])
      }),
      category: 'write_escalated',
      handler: async (args) => {
        const { walletId, strategyId, amount, asset } = args as {
          walletId: string
          strategyId: string
          amount: string
          asset: 'USDC' | 'SOL'
        }
        const result = await context.yieldService.deposit({
          walletId,
          strategyId,
          amount: { amount, asset }
        })
        if (!result.ok) throw new Error(result.error.message)
        return { position: result.value }
      }
    }),
    asTool({
      name: 'hoshi_withdraw_yield',
      description: 'Withdraw from a yield position',
      inputSchema: z.object({
        walletId: z.string(),
        positionId: z.string()
      }),
      category: 'write_escalated',
      handler: async (args) => {
        const { walletId, positionId } = args as { walletId: string; positionId: string }
        const result = await context.yieldService.withdraw({ walletId, positionId })
        if (!result.ok) throw new Error(result.error.message)
        return { receipt: result.value }
      }
    })
  ]
}
