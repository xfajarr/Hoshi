import { PublicKey } from '@solana/web3.js'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockRegistry = vi.hoisted(() => ({
  claim: vi.fn(),
  resolve: vi.fn(),
  issueAttestation: vi.fn(),
  updateReputation: vi.fn(),
}))

vi.mock('../src/kya/anchor-registry.js', () => ({
  KyaAnchorRegistry: vi.fn().mockImplementation(() => mockRegistry),
}))

import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'
import { KyaAnchorRegistry } from '../src/kya/anchor-registry.js'

describe('KYA Anchor wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('constructs the Anchor-backed registry and delegates KYA calls', async () => {
    const storage = new InMemoryStorageAdapter()
    const hoshi = new Hoshi({ storage })
    const created = await hoshi.createWallet({ pin: '12345678', label: 'Agent Wallet' })
    await hoshi.loadWallet(created.walletId, '12345678')

    let profile: {
      handle: string
      owner: string
      displayName: string
      createdAt: string
      updatedAt: string
      reputation: { score: number; attestationCount: number; lastUpdatedAt: string }
    } | null = null

    const updateProfile = (delta: number) => {
      if (!profile) return null
      const updatedAt = '2026-05-09T00:00:00.000Z'
      profile = {
        ...profile,
        updatedAt,
        reputation: {
          score: profile.reputation.score + delta,
          attestationCount: profile.reputation.attestationCount + 1,
          lastUpdatedAt: updatedAt,
        },
      }
      return profile
    }

    mockRegistry.claim.mockResolvedValue({
      handle: 'namaagent.hoshi',
      owner: created.publicKey,
      displayName: 'Nama Agent',
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
      reputation: {
        score: 0,
        attestationCount: 0,
        lastUpdatedAt: '2026-05-09T00:00:00.000Z',
      },
    })
    mockRegistry.resolve.mockImplementation(async () => profile)
    mockRegistry.updateReputation.mockImplementation(async () => updateProfile(1))
    mockRegistry.issueAttestation.mockImplementation(async input => {
      await mockRegistry.updateReputation(input.handle, 1)
      return {
        id: 'att-1',
        subjectHandle: 'namaagent.hoshi',
        issuer: 'hoshi',
        type: input.type,
        payload: input.payload,
        createdAt: '2026-05-09T00:00:00.000Z',
      }
    })

    const claimed = await hoshi.kya.claimHandle({
      handle: 'NamaAgent.Hoshi',
      displayName: 'Nama Agent',
    })

    profile = claimed

    expect(KyaAnchorRegistry).toHaveBeenCalledTimes(1)
    expect(KyaAnchorRegistry).toHaveBeenCalledWith(
      expect.objectContaining({
        programId: new PublicKey('11111111111111111111111111111111'),
        walletOwner: expect.any(Function),
      }),
    )
    expect(mockRegistry.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: 'NamaAgent.Hoshi',
        displayName: 'Nama Agent',
        owner: created.publicKey,
      }),
    )
    expect(claimed.owner).toBe(created.publicKey)

    const resolved = await hoshi.kya.resolveHandle('namaagent.hoshi')
    expect(resolved?.handle).toBe('namaagent.hoshi')

    const attestation = await hoshi.kya.issueAttestation({
      handle: 'namaagent.hoshi',
      type: 'payment.completed',
      payload: { amount: '10', asset: 'SOL' },
    })

    expect(attestation.issuer).toBe('hoshi')
    expect(mockRegistry.updateReputation).toHaveBeenCalledWith('namaagent.hoshi', 1)
    await expect(hoshi.kya.getProfile('namaagent.hoshi')).resolves.toMatchObject({
      reputation: { attestationCount: 1, score: 1 },
    })
  })
})
