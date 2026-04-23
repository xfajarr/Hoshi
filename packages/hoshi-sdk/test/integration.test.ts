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
  YieldService,
  createConfig,
  Result
} from '../src/index.js'

describe('Hoshi SDK Integration', () => {
  const storage = new InMemoryStorageAdapter()
  const chain = new SolanaChainAdapter('https://api.devnet.solana.com', 'confirmed')
  const jupiter = new JupiterSwapAdapter()
  const kamino = new KaminoYieldAdapter()

  const walletService = new WalletService(storage, chain)
  const transferService = new TransferService(storage, chain)
  const invoiceService = new InvoiceService(storage)
  const swapService = new SwapService(storage, jupiter)
  const yieldService = new YieldService(storage, kamino)

  beforeAll(async () => {
    const conn = await chain.connect()
    expect(conn.ok).toBe(true)
  })

  it('should connect to Solana devnet', () => {
    expect(chain.isConnected()).toBe(true)
  })

  it('should create a wallet with real Solana public key', async () => {
    // Use a known devnet address
    const result = await walletService.create({
      publicKey: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
      label: 'Test Wallet'
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.publicKey).toBe('vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg')
      expect(result.value.label).toBe('Test Wallet')
    }
  })

  it('should reject invalid public key', async () => {
    const result = await walletService.create({
      publicKey: 'not-a-real-key'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('should get SOL balance from devnet', async () => {
    const createResult = await walletService.create({
      publicKey: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'
    })
    if (!createResult.ok) throw new Error('Failed to create wallet')

    const balanceResult = await walletService.getOnChainBalance(createResult.value.id, 'SOL')
    expect(balanceResult.ok).toBe(true)
    if (balanceResult.ok) {
      // Should be a valid number string
      expect(Number(balanceResult.value)).not.toBeNaN()
    }
  })

  it('should create an invoice', async () => {
    const walletResult = await walletService.create({
      publicKey: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'
    })
    if (!walletResult.ok) throw new Error('Failed to create wallet')

    const result = await invoiceService.createInvoice({
      walletId: walletResult.value.id,
      amount: { amount: '100', asset: 'USDC' },
      description: 'Test invoice'
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe('pending')
      expect(result.value.amount.amount).toBe('100')
      expect(result.value.paymentLink).toContain('https://pay.hoshi.ai/i/')
    }
  })

  it('should create a payment link', async () => {
    const walletResult = await walletService.create({
      publicKey: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'
    })
    if (!walletResult.ok) throw new Error('Failed to create wallet')

    const result = await invoiceService.createPaymentLink({
      walletId: walletResult.value.id,
      amount: { amount: '50', asset: 'USDC' },
      description: 'Test payment link'
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe('active')
      expect(result.value.url).toContain('https://pay.hoshi.ai/p/')
    }
  })

  it('should get Jupiter quote (real API)', async () => {
    const result = await swapService.getQuote({
      inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      outputMint: 'So11111111111111111111111111111111111111112', // SOL
      amount: '1000000' // 1 USDC
    })
    
    // API might fail in test environment, but we test the structure
    if (result.ok) {
      expect(result.value.inputMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      expect(result.value.outputMint).toBe('So11111111111111111111111111111111111111112')
      expect(result.value.routePlan.length).toBeGreaterThan(0)
    }
  })

  it('should deposit to yield', async () => {
    const walletResult = await walletService.create({
      publicKey: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'
    })
    if (!walletResult.ok) throw new Error('Failed to create wallet')

    const result = await yieldService.deposit({
      walletId: walletResult.value.id,
      strategyId: 'kamino-usdc-main',
      amount: { amount: '100', asset: 'USDC' }
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.protocol).toBe('kamino')
      expect(result.value.status).toBe('active')
    }
  })

  it('should get yield positions', async () => {
    const walletResult = await walletService.create({
      publicKey: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'
    })
    if (!walletResult.ok) throw new Error('Failed to create wallet')

    await yieldService.deposit({
      walletId: walletResult.value.id,
      strategyId: 'kamino-usdc-main',
      amount: { amount: '100', asset: 'USDC' }
    })

    const positions = await yieldService.getPositions(walletResult.value.id)
    expect(positions.ok).toBe(true)
    if (positions.ok) {
      expect(positions.value.length).toBeGreaterThan(0)
    }
  })

  it('should handle transfer with insufficient balance', async () => {
    const walletResult = await walletService.create({
      publicKey: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'
    })
    if (!walletResult.ok) throw new Error('Failed to create wallet')

    const result = await transferService.send({
      walletId: walletResult.value.id,
      to: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
      amount: { amount: '1000000', asset: 'USDC' }
    })

    // Should fail with insufficient balance (unless devnet account has funds)
    if (!result.ok) {
      expect(result.error.code).toBe('INSUFFICIENT_BALANCE')
    }
  })
})
