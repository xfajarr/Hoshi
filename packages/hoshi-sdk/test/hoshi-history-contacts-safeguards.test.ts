import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { Transaction } from '@solana/web3.js'
import { describe, expect, it, afterEach } from 'vitest'
import { Hoshi, HoshiSDKError, InMemoryStorageAdapter, Result, type ChainPort, type SignerPort, type Receipt, type Wallet } from '../src/index.js'

const wallet: Wallet = {
  id: '11111111-1111-1111-1111-111111111111',
  publicKey: '11111111111111111111111111111111',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const cleanupDirs: string[] = []

afterEach(() => {
  for (const dir of cleanupDirs.splice(0, cleanupDirs.length)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function createMockChain(): ChainPort {
  return {
    rpcEndpoint: 'http://localhost:8899',
    commitment: 'confirmed',
    async connect() {
      return Result.ok(undefined)
    },
    async disconnect() {
      return Result.ok(undefined)
    },
    isConnected() {
      return true
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

function createTestHoshi() {
  const configDir = mkdtempSync(join(tmpdir(), 'hoshi-sdk-core-'))
  const storage = new InMemoryStorageAdapter()
  const hoshi = new Hoshi({
    storage,
    chain: createMockChain(),
    configDir,
  })

  cleanupDirs.push(configDir)

  return { hoshi, storage }
}

describe('history facade', () => {
  it('returns raw receipts through history helpers', async () => {
    const { hoshi, storage } = createTestHoshi()

    await storage.saveWallet(wallet)

    const now = Date.now()
    const olderTimestamp = new Date(now - 48 * 60 * 60 * 1000).toISOString()
    const newerTimestamp = new Date(now - 60 * 60 * 1000).toISOString()

    const older: Receipt = {
      id: '22222222-2222-2222-2222-222222222222',
      actionType: 'transfer.send',
      walletId: wallet.id,
      status: 'success',
      amount: { amount: '1', asset: 'SOL' },
      description: 'Older receipt',
      timestamp: olderTimestamp,
    }
    const newer: Receipt = {
      id: '33333333-3333-3333-3333-333333333333',
      actionType: 'transfer.receive',
      walletId: wallet.id,
      status: 'success',
      amount: { amount: '2', asset: 'SOL' },
      description: 'Newer receipt',
      timestamp: newerTimestamp,
    }

    await storage.saveReceipt(older)
    await storage.saveReceipt(newer)

    await expect(hoshi.getHistory(wallet.id)).resolves.toEqual([newer, older])
    await expect(hoshi.history(wallet.id)).resolves.toEqual([newer, older])
    await expect(hoshi.getReceipts(wallet.id)).resolves.toEqual([newer, older])
    await expect(hoshi.receipts(wallet.id)).resolves.toEqual([newer, older])
    await expect(hoshi.getReceipt(newer.id)).resolves.toEqual(newer)
    await expect(hoshi.getRecentHistory(wallet.id, 24 * 60 * 60 * 1000)).resolves.toEqual([newer])
  })
})

describe('contacts facade', () => {
  it('exposes contacts as stable top-level helpers', async () => {
    const { hoshi } = createTestHoshi()

    expect(hoshi.addContact('treasury', '11111111111111111111111111111111', 'Treasury')).toEqual({ action: 'added' })
    expect(hoshi.getContact('treasury')).toMatchObject({
      name: 'treasury',
      label: 'Treasury',
      address: '11111111111111111111111111111111',
    })
    expect(hoshi.listContacts()).toHaveLength(1)
    expect(hoshi.resolveContact('treasury')).toEqual({
      address: '11111111111111111111111111111111',
      contactName: 'treasury',
    })
    expect(hoshi.removeContact('treasury')).toBe(true)
    expect(hoshi.getContact('treasury')).toBeNull()
  })
})

describe('safeguard facade', () => {
  it('returns explicit approval and block outcomes', async () => {
    const { hoshi, storage } = createTestHoshi()

    await storage.saveWallet(wallet)
    await hoshi.loadWalletByPublicKey(wallet.publicKey)
    hoshi.setSigner(createMockSigner())

    expect(hoshi.checkSafeguard({ operation: 'transfer', amount: 1, asset: 'SOL' })).toEqual({
      status: 'allowed',
    })

    hoshi.safeguards.lock()

    expect(hoshi.checkSafeguard({ operation: 'transfer', amount: 1, asset: 'SOL' })).toEqual({
      status: 'pending_approval',
      safeguard: 'locked',
      detail: {},
    })

    await expect(hoshi.transfer({
      to: wallet.publicKey,
      amount: '1',
      asset: 'SOL',
    })).rejects.toMatchObject({
      code: 'SAFEGUARD_BLOCKED',
      data: {
        safeguardOutcome: {
          status: 'pending_approval',
          safeguard: 'locked',
        },
      },
    })

    hoshi.safeguards.unlock()
    hoshi.safeguards.set('maxPerTx', 0.5)

    expect(hoshi.checkSafeguard({ operation: 'transfer', amount: 1, asset: 'SOL' })).toMatchObject({
      status: 'blocked',
      safeguard: 'maxPerTx',
      detail: {
        attempted: 1,
        limit: 0.5,
      },
    })
  })
})
