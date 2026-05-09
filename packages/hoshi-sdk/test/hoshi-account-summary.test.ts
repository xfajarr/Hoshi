import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  Hoshi,
  InMemoryStorageAdapter,
  Result,
  type ChainPort,
  HoshiSDKError,
} from '../src/index.js'

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
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not implemented'))
    },
    async simulateTransaction() {
      return Result.ok(null)
    },
    async confirmTransaction() {
      return Result.ok(undefined)
    },
    async createTransferInstruction() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not implemented'))
    },
    async getAssociatedTokenAddress() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not implemented'))
    },
    async createAssociatedTokenAccount() {
      return Result.err(new HoshiSDKError('CHAIN_ERROR', 'not implemented'))
    },
  }
}

describe('Hoshi account summary', () => {
  let directory: string | undefined
  let storage: InMemoryStorageAdapter
  let hoshi: Hoshi

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'hoshi-sdk-summary-'))
    storage = new InMemoryStorageAdapter()
    hoshi = new Hoshi({
      keyPath: directory,
      storage,
      chain: createMockChain(),
    })
  })

  afterEach(() => {
    if (directory) {
      rmSync(directory, { recursive: true, force: true })
      directory = undefined
    }
  })

  it('returns a stable empty summary when no wallet is loaded', async () => {
    await hoshi.connect()

    const summary = await hoshi.getAccountSummary()

    expect(summary).toEqual({
      walletId: null,
      publicKey: null,
      connected: true,
      balances: {
        SOL: null,
        USDC: null,
      },
      available: {
        SOL: null,
        USDC: null,
      },
      activity: {
        receiptCount: 0,
        recentReceiptCount: 0,
      },
    })
  })

  it('returns wallet, balance, and activity data without changing balance APIs', async () => {
    const pin = 'very-secure-pin'
    const created = await hoshi.createWallet({
      pin,
      label: 'Agent Wallet',
    })

    await hoshi.loadWallet(created.walletId, pin)
    await hoshi.connect()

    await storage.saveReceipt({
      id: crypto.randomUUID(),
      actionType: 'transfer.send',
      walletId: created.walletId,
      status: 'success',
      amount: { amount: '1.25', asset: 'SOL' },
      description: 'Recent transfer',
      timestamp: new Date().toISOString(),
    })

    await storage.saveReceipt({
      id: crypto.randomUUID(),
      actionType: 'yield.deposit',
      walletId: created.walletId,
      status: 'success',
      amount: { amount: '2', asset: 'USDC' },
      description: 'Older deposit',
      timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const summary = await hoshi.getAccountSummary()

    expect(summary).toEqual({
      walletId: created.walletId,
      publicKey: created.publicKey,
      connected: true,
      balances: {
        SOL: '2.5',
        USDC: '42',
      },
      available: {
        SOL: '2.5',
        USDC: '42',
      },
      activity: {
        receiptCount: 2,
        recentReceiptCount: 1,
      },
    })

    await expect(hoshi.getBalance('SOL')).resolves.toBe('2.5')
    await expect(hoshi.balance('SOL')).resolves.toBe('2.5')
    await expect(hoshi.getBalances()).resolves.toEqual({
      SOL: '2.5',
      USDC: '42',
    })
    await expect(hoshi.balances()).resolves.toEqual({
      SOL: '2.5',
      USDC: '42',
    })
  })
})
