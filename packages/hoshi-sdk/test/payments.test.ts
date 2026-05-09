import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { Transaction } from '@solana/web3.js'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { Hoshi, HoshiSDKError, InMemoryStorageAdapter, Result, type ChainPort, type SignerPort, type Wallet } from '../src/index.js'
import { PAYMENT_PROTOCOLS } from '../src/payments/types.js'
import { toMppPaymentIntent } from '../src/payments/mpp.js'
import { toX402PaymentRequirement } from '../src/payments/x402.js'

const wallet: Wallet = {
  id: '11111111-1111-1111-1111-111111111111',
  publicKey: '11111111111111111111111111111111',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createMockChain(): ChainPort {
  let connected = false

  return {
    rpcEndpoint: 'http://localhost:8899',
    commitment: 'confirmed',
    async connect() {
      connected = true
      return Result.ok(undefined)
    },
    async disconnect() {
      connected = false
      return Result.ok(undefined)
    },
    isConnected() {
      return connected
    },
    async getBalance() {
      return Result.ok(BigInt(2_500_000_000))
    },
    async getTokenBalance() {
      return Result.ok(BigInt(42_000_000))
    },
    async getBalances() {
      return Result.ok([])
    },
    async getAccountInfo() {
      return Result.ok(null)
    },
    async getLatestBlockhash() {
      return Result.ok('mock-blockhash')
    },
    async sendTransaction() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not implemented'))
    },
    async sendRawTransaction() {
      return Result.ok('mock-raw-signature')
    },
    async simulateTransaction() {
      return Result.ok(null)
    },
    async confirmTransaction() {
      return Result.ok(undefined)
    },
    async createTransferInstruction() {
      return Result.ok(new Transaction())
    },
    async getAssociatedTokenAddress() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not implemented'))
    },
    async createAssociatedTokenAccount() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not implemented'))
    },
  }
}

function createMockSigner(): SignerPort {
  return {
    publicKey: wallet.publicKey,
    async signTransaction(transaction) {
      return Result.ok(transaction)
    },
    async signAndSendTransaction(_transaction, sendRawTransaction) {
      await sendRawTransaction(new Uint8Array([1, 2, 3]))
      return Result.ok('mock-signature')
    },
  }
}

function createSendHoshi() {
  const configDir = mkdtempSync(join(tmpdir(), 'hoshi-sdk-send-'))
  const storage = new InMemoryStorageAdapter()
  const hoshi = new Hoshi({
    storage,
    chain: createMockChain(),
    configDir,
  })

  return {
    configDir,
    storage,
    hoshi,
  }
}

afterEach(() => {
  for (const dir of cleanupDirs.splice(0, cleanupDirs.length)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

const cleanupDirs: string[] = []

describe('payment helpers', () => {
  it('serializes x402 requirements with unified protocols', () => {
    const invoice = {
      id: '22222222-2222-2222-2222-222222222222',
      walletId: wallet.id,
      amount: { amount: '12.5', asset: 'USDC' as const },
      description: 'Invoice test',
      status: 'pending' as const,
      paymentLink: 'https://pay.hoshi.ai/i/test',
      createdAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-01-02T00:00:00.000Z',
    }

    const wrapper = toX402PaymentRequirement(invoice)

    expect(wrapper).toMatchObject({
      kind: 'x402',
      protocols: PAYMENT_PROTOCOLS,
      id: invoice.id,
      walletId: wallet.id,
      amount: invoice.amount,
      description: invoice.description,
      record: invoice,
    })
    expect(JSON.parse(JSON.stringify(wrapper)).protocols).toEqual(['x402', 'mpp'])
  })

  it('serializes mpp intents with unified protocols', () => {
    const paymentLink = {
      id: '33333333-3333-3333-3333-333333333333',
      walletId: wallet.id,
      amount: { amount: '3', asset: 'SOL' as const },
      description: 'Payment link test',
      url: 'https://pay.hoshi.ai/p/test',
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-01-02T00:00:00.000Z',
    }

    const wrapper = toMppPaymentIntent(paymentLink)

    expect(wrapper).toMatchObject({
      kind: 'mpp',
      protocols: PAYMENT_PROTOCOLS,
      id: paymentLink.id,
      walletId: wallet.id,
      amount: paymentLink.amount,
      description: paymentLink.description,
      record: paymentLink,
    })
    expect(JSON.parse(JSON.stringify(wrapper)).record.url).toBe(paymentLink.url)
  })
})

describe('Hoshi payment surface', () => {
  it('aliases pay to transfer', async () => {
    const hoshi = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const transfer = vi.spyOn(hoshi, 'transfer').mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      actionType: 'transfer.send',
      walletId: wallet.id,
      status: 'success',
      description: 'ok',
      timestamp: '2026-01-01T00:00:00.000Z',
    } as never)

    await expect(hoshi.pay({ to: wallet.publicKey, amount: '1', asset: 'SOL' })).resolves.toMatchObject({
      id: '44444444-4444-4444-4444-444444444444',
    })
    expect(transfer).toHaveBeenCalledOnce()
  })

  it('aliases send to transfer', async () => {
    const hoshi = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const transfer = vi.spyOn(hoshi, 'transfer').mockResolvedValue({
      id: '55555555-5555-5555-5555-555555555555',
      actionType: 'transfer.send',
      walletId: wallet.id,
      status: 'success',
      description: 'ok',
      timestamp: '2026-01-01T00:00:00.000Z',
    } as never)

    await expect(hoshi.send({ to: wallet.publicKey, amount: '1', asset: 'SOL' })).resolves.toMatchObject({
      id: '55555555-5555-5555-5555-555555555555',
    })
    expect(transfer).toHaveBeenCalledOnce()
  })

  it('returns normalized send receipts with stable top-level fields', async () => {
    const { configDir, storage, hoshi } = createSendHoshi()
    cleanupDirs.push(configDir)

    await storage.saveWallet(wallet)
    await hoshi.loadWalletByPublicKey(wallet.publicKey)
    hoshi.setSigner(createMockSigner())

    const receipt = await hoshi.transfer({
      to: wallet.publicKey,
      amount: '1',
      asset: 'SOL',
    })

    expect(receipt).toMatchObject({
      actionType: 'transfer.send',
      status: 'success',
      walletId: wallet.id,
      to: wallet.publicKey,
      signature: 'mock-signature',
      explorerUrl: 'https://explorer.solana.com/tx/mock-signature?cluster=devnet',
    })
  })

  it('keeps safeguard blocks machine-readable for send flows', async () => {
    const { configDir, storage, hoshi } = createSendHoshi()
    cleanupDirs.push(configDir)

    await storage.saveWallet(wallet)
    await hoshi.loadWalletByPublicKey(wallet.publicKey)
    hoshi.setSigner(createMockSigner())
    hoshi.safeguards.lock()

    await expect(hoshi.transfer({
      to: wallet.publicKey,
      amount: '1',
      asset: 'SOL',
    })).rejects.toMatchObject({ code: 'SAFEGUARD_BLOCKED' })

    await expect(hoshi.pay({
      to: wallet.publicKey,
      amount: '1',
      asset: 'SOL',
    })).rejects.toMatchObject({ code: 'SAFEGUARD_BLOCKED' })
  })

  it('keeps invalid recipient errors machine-readable', async () => {
    const { configDir, storage, hoshi } = createSendHoshi()
    cleanupDirs.push(configDir)

    await storage.saveWallet(wallet)
    await hoshi.loadWalletByPublicKey(wallet.publicKey)
    hoshi.setSigner(createMockSigner())

    await expect(hoshi.transfer({
      to: 'not-a-public-key',
      amount: '1',
      asset: 'SOL',
    })).rejects.toMatchObject({ code: 'INVALID_ADDRESS' })
  })

  it('wraps stored invoices from receive', async () => {
    const storage = new InMemoryStorageAdapter()
    await storage.saveWallet(wallet)
    const hoshi = new Hoshi({ storage })

    const wrapper = await hoshi.receive({
      walletId: wallet.id,
      amount: '7.25',
      asset: 'USDC',
      description: 'Receive test',
    })

    expect(wrapper.kind).toBe('x402')
    expect(wrapper.protocols).toEqual(['x402', 'mpp'])
    expect(wrapper.walletId).toBe(wallet.id)
    expect(wrapper.amount).toEqual({ amount: '7.25', asset: 'USDC' })

    const stored = await hoshi.invoiceService.getInvoice(wrapper.id)
    expect(stored.ok).toBe(true)
    if (stored.ok && stored.value) {
      expect(stored.value.description).toBe('Receive test')
      expect(stored.value.id).toBe(wrapper.record.id)
    }
  })

  it('wraps stored payment links from createPaymentLink', async () => {
    const storage = new InMemoryStorageAdapter()
    await storage.saveWallet(wallet)
    const hoshi = new Hoshi({ storage })

    const wrapper = await hoshi.createPaymentLink({
      walletId: wallet.id,
      amount: '2.5',
      asset: 'SOL',
      description: 'Link test',
    })

    expect(wrapper.kind).toBe('mpp')
    expect(wrapper.protocols).toEqual(['x402', 'mpp'])
    expect(wrapper.walletId).toBe(wallet.id)
    expect(wrapper.record.url).toContain('/p/')

    const stored = await hoshi.storage.getPaymentLink(wrapper.id)
    expect(stored.ok).toBe(true)
    if (stored.ok && stored.value) {
      expect(stored.value.description).toBe('Link test')
      expect(stored.value.id).toBe(wrapper.record.id)
    }
  })
})
