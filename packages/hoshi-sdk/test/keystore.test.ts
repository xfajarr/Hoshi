import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { EncryptedKeypairVault } from '../src/index.js'

describe('EncryptedKeypairVault', () => {
  let directory: string | undefined

  afterEach(() => {
    if (directory) {
      rmSync(directory, { recursive: true, force: true })
      directory = undefined
    }
  })

  it('creates and unlocks a managed wallet keystore', () => {
    directory = mkdtempSync(join(tmpdir(), 'hoshi-vault-'))
    const vault = new EncryptedKeypairVault(directory)

    const createResult = vault.create({
      walletId: crypto.randomUUID(),
      pin: 'very-secure-pin',
      label: 'Agent Wallet',
      defaultCluster: 'devnet',
    })

    expect(createResult.ok).toBe(true)
    if (!createResult.ok) return

    const unlockResult = vault.unlock(createResult.value.walletId, 'very-secure-pin')
    expect(unlockResult.ok).toBe(true)
    if (!unlockResult.ok) return

    expect(unlockResult.value.publicKey).toBe(createResult.value.publicKey)
  })

  it('rejects an invalid wallet pin', () => {
    directory = mkdtempSync(join(tmpdir(), 'hoshi-vault-'))
    const vault = new EncryptedKeypairVault(directory)

    const createResult = vault.create({
      walletId: crypto.randomUUID(),
      pin: 'very-secure-pin',
    })

    expect(createResult.ok).toBe(true)
    if (!createResult.ok) return

    const unlockResult = vault.unlock(createResult.value.walletId, 'wrong-pin')
    expect(unlockResult.ok).toBe(false)
    if (!unlockResult.ok) {
      expect(unlockResult.error.code).toBe('AUTHENTICATION_ERROR')
    }
  })
})
