import { describe, it, expect, beforeAll } from 'vitest'
import {
  SolanaChainAdapter,
  InMemoryStorageAdapter,
  JupiterSwapAdapter,
  KaminoYieldAdapter,
  WalletService,
  TransferService,
  InvoiceService,
  SwapService,
  YieldService
} from '@hoshi/sdk'
import { registerFinancialTools, getTool, listTools } from '../src/index.js'

describe('MCP Financial Tools', () => {
  beforeAll(() => {
    const storage = new InMemoryStorageAdapter()
    const chain = new SolanaChainAdapter('https://api.devnet.solana.com')
    const jupiter = new JupiterSwapAdapter()
    const kamino = new KaminoYieldAdapter()

    registerFinancialTools({
      walletService: new WalletService(storage, chain),
      transferService: new TransferService(storage, chain),
      invoiceService: new InvoiceService(storage),
      swapService: new SwapService(storage, jupiter),
      yieldService: new YieldService(storage, kamino)
    })
  })

  it('should register all tools', () => {
    const tools = listTools()
    expect(tools.length).toBeGreaterThan(0)
    expect(tools.some(t => t.name === 'hoshi_balance')).toBe(true)
    expect(tools.some(t => t.name === 'hoshi_send')).toBe(true)
    expect(tools.some(t => t.name === 'hoshi_swap_quote')).toBe(true)
  })

  it('should categorize tools correctly', () => {
    const balanceTool = getTool('hoshi_balance')
    expect(balanceTool?.category).toBe('read')

    const sendTool = getTool('hoshi_send')
    expect(sendTool?.category).toBe('write_escalated')

    const invoiceTool = getTool('hoshi_create_invoice')
    expect(invoiceTool?.category).toBe('write_safe')
  })

  it('should handle balance read tool', async () => {
    const tool = getTool('hoshi_balance')
    expect(tool).toBeDefined()

    // Should fail with non-existent wallet
    try {
      await tool!.handler({ walletId: '00000000-0000-0000-0000-000000000000', asset: 'SOL' })
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeDefined()
    }
  })
})
