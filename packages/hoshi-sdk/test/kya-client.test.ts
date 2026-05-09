import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/kya/anchor-registry.js', () => ({
  KyaAnchorRegistry: vi.fn().mockImplementation(() => ({
    claim: vi.fn(),
    resolve: vi.fn(),
    issueAttestation: vi.fn(),
    updateReputation: vi.fn(),
  })),
}))

import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('Hoshi KYA client', () => {
  it('does not export the in-memory registry from the package surface', async () => {
    const sdk = await import('../src/index.js')

    expect(sdk.InMemoryKyaRegistry).toBeUndefined()
  })

  it('keeps the public KYA client surface stable', () => {
    const storage = new InMemoryStorageAdapter()
    const hoshi = new Hoshi({ storage })

    expect(hoshi.kya.claimHandle).toBeTypeOf('function')
    expect(hoshi.kya.resolveHandle).toBeTypeOf('function')
    expect(hoshi.kya.getProfile).toBeTypeOf('function')
    expect(hoshi.kya.issueAttestation).toBeTypeOf('function')
    expect(hoshi.kya.updateReputation).toBeTypeOf('function')
  })
})
