import { describe, expect, it } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('Hoshi KYA client', () => {
  it('claims, resolves, and updates a Hoshi identity', async () => {
    const storage = new InMemoryStorageAdapter()
    const hoshi = new Hoshi({ storage })
    const created = await hoshi.createWallet({ pin: '12345678', label: 'Agent Wallet' })
    await hoshi.loadWallet(created.walletId, '12345678')

    const claimed = await hoshi.kya.claimHandle({
      handle: 'namaagent.hoshi',
      displayName: 'Nama Agent',
    })

    expect(claimed.handle).toBe('namaagent.hoshi')
    expect(claimed.displayName).toBe('Nama Agent')
    expect(claimed.owner).toBe(created.publicKey)
    expect(claimed.reputation.score).toBe(0)

    const resolved = await hoshi.kya.resolveHandle('namaagent.hoshi')
    expect(resolved?.owner).toBe(claimed.owner)

    const attestation = await hoshi.kya.issueAttestation({
      handle: 'namaagent.hoshi',
      type: 'payment.completed',
      payload: { amount: '10', asset: 'SOL' },
    })

    expect(attestation.issuer).toBe('hoshi')
    await expect(hoshi.kya.getProfile('namaagent.hoshi')).resolves.toMatchObject({
      handle: 'namaagent.hoshi',
      reputation: { attestationCount: 1, score: 1 },
    })
  })
})
