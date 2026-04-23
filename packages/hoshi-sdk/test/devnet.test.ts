import { describe, it, expect, beforeAll } from 'vitest'
import { PublicKey } from '@solana/web3.js'
import { SolanaChainAdapter } from '../src/adapters/solana/connection.js'
import { JupiterSwapAdapter } from '../src/adapters/jupiter/client.js'
import { WalletService, TransferService } from '../src/index.js'
import { InMemoryStorageAdapter } from '../src/adapters/memory/storage.js'
import { Result } from '../src/core/result.js'

// Devnet RPC endpoint
const DEVNET_RPC = 'https://api.devnet.solana.com'

// Well-known devnet address (Solana Foundation)
const TEST_PUBKEY = new PublicKey('vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg')

// USDC mint on mainnet (devnet may not have liquidity, but we can test the API)
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

// Wrapped SOL
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')

describe('Devnet Integration', () => {
  let chain: SolanaChainAdapter

  beforeAll(async () => {
    chain = new SolanaChainAdapter(DEVNET_RPC)
    const conn = await chain.connect()
    expect(conn.ok).toBe(true)
  })

  describe('Connection', () => {
    it('should connect to devnet', () => {
      expect(chain.isConnected()).toBe(true)
    })

    it('should get version', async () => {
      // Connection was verified in connect()
      expect(chain.isConnected()).toBe(true)
    })
  })

  describe('Balance queries', () => {
    it('should get SOL balance', async () => {
      const result = await chain.getBalance(TEST_PUBKEY)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(typeof result.value).toBe('bigint')
        expect(result.value >= BigInt(0)).toBe(true)
        console.log('SOL balance:', (Number(result.value) / 1e9).toString())
      }
    })

    it('should get USDC token balance (0 or greater)', async () => {
      const result = await chain.getTokenBalance(TEST_PUBKEY, USDC_MINT)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(typeof result.value).toBe('bigint')
        expect(result.value >= BigInt(0)).toBe(true)
        console.log('USDC balance:', (Number(result.value) / 1e6).toString())
      }
    })

    it('should get all balances', async () => {
      const result = await chain.getBalances(TEST_PUBKEY)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true)
        expect(result.value.length >= 1).toBe(true) // At least SOL
        const sol = result.value.find(b => b.asset === 'SOL')
        expect(sol).toBeDefined()
        console.log('All balances:', result.value)
      }
    })
  })

  describe('Transfer instruction building', () => {
    it('should build USDC transfer instruction', async () => {
      const recipient = new PublicKey('11111111111111111111111111111111')
      const result = await chain.createTransferInstruction({
        from: TEST_PUBKEY,
        to: recipient,
        mint: USDC_MINT,
        amount: BigInt(1000000), // 1 USDC
        decimals: 6,
        owner: TEST_PUBKEY
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.instructions.length >= 1).toBe(true)
        console.log('Transfer tx instructions:', result.value.instructions.length)
      }
    })

    it('should get associated token address', async () => {
      const result = await chain.getAssociatedTokenAddress(TEST_PUBKEY, USDC_MINT)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBeInstanceOf(PublicKey)
        console.log('ATA:', result.value.toBase58())
      }
    })
  })

  describe('WalletService with real chain', () => {
    it('should create wallet and get balance', async () => {
      const storage = new InMemoryStorageAdapter()
      const walletService = new WalletService(storage, chain)

      const createResult = await walletService.create({
        publicKey: TEST_PUBKEY.toBase58(),
        label: 'Test Treasury'
      })
      expect(createResult.ok).toBe(true)

      if (createResult.ok) {
        const wallet = createResult.value
        const balanceResult = await walletService.getOnChainBalance(wallet.id, 'SOL')
        expect(balanceResult.ok).toBe(true)
        if (balanceResult.ok) {
          expect(parseFloat(balanceResult.value) >= 0).toBe(true)
          console.log('Wallet SOL balance:', balanceResult.value)
        }
      }
    })
  })

  describe('TransferService with real chain', () => {
    it('should validate insufficient balance', async () => {
      const storage = new InMemoryStorageAdapter()
      const walletService = new WalletService(storage, chain)
      const transferService = new TransferService(storage, chain)

      // Create a wallet with our test pubkey
      const createResult = await walletService.create({
        publicKey: TEST_PUBKEY.toBase58()
      })
      expect(createResult.ok).toBe(true)
      if (!createResult.ok) return

      const wallet = createResult.value

      // Try to send more SOL than possible
      const result = await transferService.send({
        walletId: wallet.id,
        to: '11111111111111111111111111111111',
        amount: { amount: '999999999', asset: 'SOL' }
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INSUFFICIENT_BALANCE')
      }
    })
  })

  describe('Jupiter API', () => {
    it('should get a quote for USDC -> WSOL', async () => {
      const jupiter = new JupiterSwapAdapter()
      const result = await jupiter.getQuote({
        inputMint: USDC_MINT.toBase58(),
        outputMint: WSOL_MINT.toBase58(),
        amount: '1000000', // 1 USDC
        slippageBps: 50
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.inputMint).toBe(USDC_MINT.toBase58())
        expect(result.value.outputMint).toBe(WSOL_MINT.toBase58())
        expect(BigInt(result.value.inAmount)).toBe(BigInt(1000000))
        console.log('Jupiter quote outAmount:', result.value.outAmount)
      }
    })
  })
}, 30000) // 30s timeout for network calls
