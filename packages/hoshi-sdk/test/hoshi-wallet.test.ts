import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('Hoshi wallet lifecycle', () => {
  let directory: string | undefined
  let storage: InMemoryStorageAdapter
  let hoshi: Hoshi

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'hoshi-sdk-wallet-'))
    storage = new InMemoryStorageAdapter()
    hoshi = new Hoshi({
      keyPath: directory,
      storage,
    })
  })

  afterEach(() => {
    if (directory) {
      rmSync(directory, { recursive: true, force: true })
      directory = undefined
    }
  })

  it('rejects createWallet without a real pin', async () => {
    await expect(hoshi.createWallet({ label: 'Agent Wallet' } as any)).rejects.toMatchObject({
      code: 'INVALID_PIN',
    })

    await expect(hoshi.createWallet({ pin: '' } as any)).rejects.toMatchObject({
      code: 'INVALID_PIN',
    })
  })

  it('creates a managed wallet record with a keystore id', async () => {
    const result = await hoshi.createWallet({
      pin: 'very-secure-pin',
      label: 'Agent Wallet',
      cluster: 'devnet',
    })

    expect(result.publicKey).toBeTruthy()

    const walletResult = await storage.getWallet(result.walletId)
    expect(walletResult.ok).toBe(true)
    if (!walletResult.ok || !walletResult.value) return

    expect(walletResult.value.managed).toBe(true)
    expect(walletResult.value.keystoreId).toBe(result.walletId)
    expect(walletResult.value.publicKey).toBe(result.publicKey)
  })

  it('returns null from loadWallet when the pin is wrong', async () => {
    const created = await hoshi.createWallet({
      pin: 'very-secure-pin',
      label: 'Agent Wallet',
    })

    const loaded = await hoshi.loadWallet(created.walletId, 'wrong-pin')

    expect(loaded).toBeNull()
    expect(hoshi.signer).toBeNull()
    expect(hoshi.wallet).toBeNull()
  })

  it('loads the wallet, signer, and wallet state with the right pin', async () => {
    const created = await hoshi.createWallet({
      pin: 'very-secure-pin',
      label: 'Agent Wallet',
    })

    const loaded = await hoshi.loadWallet(created.walletId, 'very-secure-pin')

    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe(created.walletId)
    expect(hoshi.wallet?.id).toBe(created.walletId)
    expect(hoshi.wallet?.publicKey).toBe(created.publicKey)
    expect(hoshi.signer?.publicKey).toBe(created.publicKey)
  })
})
