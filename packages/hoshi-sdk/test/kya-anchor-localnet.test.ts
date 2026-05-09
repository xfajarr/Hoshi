import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

const RPC_URL = process.env.ANCHOR_PROVIDER_URL ?? 'http://127.0.0.1:8899'
const PROGRAM_ID = '7QaaaMxxPavk8KRZwS5WwbPzPmRkXPtjFmfxh2M8ev1Z'


describe('KYA Anchor localnet', () => {
  const connection = new Connection(RPC_URL, 'confirmed')
  let keyPath: string | undefined

  beforeAll(async () => {
    await connection.getVersion()
  })

  afterEach(() => {
    if (keyPath) {
      rmSync(keyPath, { recursive: true, force: true })
      keyPath = undefined
    }
  })

  it('uses the program-backed path for claim and resolution', async () => {
    process.env.HOSHI_KYA_PROGRAM_ID = PROGRAM_ID
    const storage = new InMemoryStorageAdapter()
    keyPath = mkdtempSync(join(tmpdir(), 'hoshi-sdk-kya-localnet-'))
    const hoshi = new Hoshi({ rpcUrl: RPC_URL, keyPath, storage })

    const created = await hoshi.createWallet({
      pin: '12345678',
      label: 'Agent Wallet',
    })

    const wallet = new PublicKey(created.publicKey)
    const signature = await connection.requestAirdrop(wallet, 2 * LAMPORTS_PER_SOL)
    const latest = await connection.getLatestBlockhash()
    await connection.confirmTransaction({ signature, ...latest }, 'confirmed')

    await hoshi.loadWallet(created.walletId, '12345678')

    const suffix = Date.now().toString(36)
    const primaryHandle = `sdkagent-${suffix}.hoshi`
    const secondaryHandle = `sdkother-${suffix}.hoshi`

    const claimed = await hoshi.kya.claimHandle({
      handle: primaryHandle,
      displayName: 'Nama Agent',
    })

    expect(claimed.handle).toBe(primaryHandle)
    expect(claimed.owner).toBe(created.publicKey)
    expect(claimed.displayName).toBe('Nama Agent')

    const resolved = await hoshi.kya.resolveHandle(primaryHandle)
    expect(resolved).toMatchObject({
      handle: primaryHandle,
      owner: created.publicKey,
      displayName: 'Nama Agent',
    })

    await expect(
      hoshi.kya.claimHandle({
        handle: secondaryHandle,
        displayName: 'Other Agent',
      }),
    ).rejects.toThrow()

    await expect(hoshi.kya.getProfile(primaryHandle)).resolves.toMatchObject({
      handle: primaryHandle,
      reputation: { score: 0, attestationCount: 0 },
    })
  }, 30000)
})
