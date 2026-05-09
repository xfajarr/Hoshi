# Hoshi KYA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Hoshi KYA v1 as a SDK-first identity and trust layer with `.hoshi` handles, PIN-style unlock, and Hoshi-issued reputation inputs.

**Architecture:** Start with SDK primitives and a local registry abstraction so the API can stabilize before the onchain program lands. Keep wallet custody/signing separate from identity/reputation, and make the public `Hoshi` facade the integration point for apps.

**Tech Stack:** TypeScript, Vitest, existing `@hoshi/sdk` workspace, Solana web3.js, later Anchor/Rust for the onchain registry.

---

### Task 1: Add KYA namespace + domain primitives

**Files:**
- Create: `packages/hoshi-sdk/src/kya/namespace.ts`
- Create: `packages/hoshi-sdk/src/kya/types.ts`
- Create: `packages/hoshi-sdk/src/kya/index.ts`
- Modify: `packages/hoshi-sdk/src/index.ts:1-65`
- Test: `packages/hoshi-sdk/test/kya-namespace.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { getHoshiLabel, isHoshiHandle, normalizeHoshiHandle } from '../src/kya/index.js'

describe('Hoshi KYA namespace', () => {
  it('accepts canonical .hoshi handles', () => {
    expect(isHoshiHandle('namaagent.hoshi')).toBe(true)
    expect(isHoshiHandle('agent-1.hoshi')).toBe(false)
  })

  it('normalizes whitespace and case', () => {
    expect(normalizeHoshiHandle('  NamaAgent.HOSHI  ')).toBe('namaagent.hoshi')
  })

  it('extracts the label from a handle', () => {
    expect(getHoshiLabel('namaagent.hoshi')).toBe('namaagent')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @hoshi/sdk test -- kya-namespace.test.ts`
Expected: FAIL because `packages/hoshi-sdk/src/kya/*` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export const HOSHI_NAMESPACE = '.hoshi' as const

export interface HoshiHandleParts {
  label: string
  namespace: typeof HOSHI_NAMESPACE
}

export function normalizeHoshiHandle(input: string): string {
  return input.trim().toLowerCase()
}

export function isHoshiHandle(input: string): boolean {
  const normalized = normalizeHoshiHandle(input)
  return /^[a-z0-9][a-z0-9_]{1,30}\.hoshi$/.test(normalized)
}

export function getHoshiLabel(handle: string): string {
  const normalized = normalizeHoshiHandle(handle)
  if (!isHoshiHandle(normalized)) {
    throw new Error(`Invalid Hoshi handle: ${handle}`)
  }
  return normalized.slice(0, -HOSHI_NAMESPACE.length)
}
```

```ts
export interface HoshiIdentity {
  handle: string
  owner: string
  displayName: string
  metadataUri?: string
  createdAt: string
  updatedAt: string
}

export interface HoshiReputation {
  score: number
  attestationCount: number
  lastUpdatedAt: string
}

export interface HoshiAttestation {
  id: string
  subjectHandle: string
  issuer: 'hoshi'
  type: string
  payload: Record<string, unknown>
  createdAt: string
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @hoshi/sdk test -- kya-namespace.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/hoshi-sdk/src/kya/namespace.ts packages/hoshi-sdk/src/kya/types.ts packages/hoshi-sdk/src/kya/index.ts packages/hoshi-sdk/src/index.ts packages/hoshi-sdk/test/kya-namespace.test.ts
git commit -m "feat: add Hoshi KYA namespace primitives"
```

### Task 2: Add KYA registry client and SDK facade

**Files:**
- Create: `packages/hoshi-sdk/src/kya/local-registry.ts`
- Create: `packages/hoshi-sdk/src/kya/client.ts`
- Modify: `packages/hoshi-sdk/src/hoshi.ts:1-679`
- Modify: `packages/hoshi-sdk/src/index.ts:1-65`
- Test: `packages/hoshi-sdk/test/kya-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @hoshi/sdk test -- kya-client.test.ts`
Expected: FAIL because `Hoshi.kya` and the local registry client do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import { normalizeHoshiHandle } from './namespace.js'
import type { HoshiAttestation, HoshiIdentity, HoshiReputation } from './types.js'

export interface KyaClaimInput {
  handle: string
  displayName: string
  owner: string
  metadataUri?: string
}

export interface KyaProfile extends HoshiIdentity {
  reputation: HoshiReputation
}

export interface KyaRegistryPort {
  claim(input: KyaClaimInput): Promise<KyaProfile>
  resolve(handle: string): Promise<KyaProfile | null>
  issueAttestation(input: { handle: string; type: string; payload: Record<string, unknown> }): Promise<HoshiAttestation>
  updateReputation(handle: string, delta: number): Promise<KyaProfile | null>
}
```

```ts
export class InMemoryKyaRegistry implements KyaRegistryPort {
  private readonly records = new Map<string, KyaProfile>()
  private readonly attestations = new Map<string, HoshiAttestation[]>()

  async claim(input: KyaClaimInput): Promise<KyaProfile> {
    const handle = normalizeHoshiHandle(input.handle)
    if (this.records.has(handle)) throw new Error('HANDLE_TAKEN')

    const now = new Date().toISOString()
    const profile: KyaProfile = {
      handle,
      owner: input.owner,
      displayName: input.displayName,
      metadataUri: input.metadataUri,
      createdAt: now,
      updatedAt: now,
      reputation: { score: 0, attestationCount: 0, lastUpdatedAt: now },
    }

    this.records.set(handle, profile)
    this.attestations.set(handle, [])
    return profile
  }

  async resolve(handle: string): Promise<KyaProfile | null> {
    return this.records.get(normalizeHoshiHandle(handle)) ?? null
  }

  async issueAttestation(input: { handle: string; type: string; payload: Record<string, unknown> }): Promise<HoshiAttestation> {
    const handle = normalizeHoshiHandle(input.handle)
    const profile = this.records.get(handle)
    if (!profile) throw new Error('HANDLE_NOT_FOUND')

    const attestation: HoshiAttestation = {
      id: crypto.randomUUID(),
      subjectHandle: handle,
      issuer: 'hoshi',
      type: input.type,
      payload: input.payload,
      createdAt: new Date().toISOString(),
    }

    const items = this.attestations.get(handle) ?? []
    items.push(attestation)
    this.attestations.set(handle, items)

    profile.reputation = {
      score: profile.reputation.score + 1,
      attestationCount: items.length,
      lastUpdatedAt: attestation.createdAt,
    }
    profile.updatedAt = attestation.createdAt
    this.records.set(handle, profile)

    return attestation
  }

  async updateReputation(handle: string, delta: number): Promise<KyaProfile | null> {
    const normalized = normalizeHoshiHandle(handle)
    const profile = this.records.get(normalized)
    if (!profile) return null

    const now = new Date().toISOString()
    profile.reputation = {
      ...profile.reputation,
      score: profile.reputation.score + delta,
      lastUpdatedAt: now,
    }
    profile.updatedAt = now
    this.records.set(normalized, profile)
    return profile
  }
}
```

```ts
export class KyaClient {
  constructor(
    private readonly registry: KyaRegistryPort,
    private readonly getOwner: () => string | null,
  ) {}

  async claimHandle(input: Omit<KyaClaimInput, 'owner'> & { owner?: string }) {
    const owner = input.owner ?? this.getOwner()
    if (!owner) throw new Error('WALLET_REQUIRED')
    return this.registry.claim({ ...input, owner })
  }

  resolveHandle(handle: string) {
    return this.registry.resolve(handle)
  }

  getProfile(handle: string) {
    return this.registry.resolve(handle)
  }

  issueAttestation(input: { handle: string; type: string; payload: Record<string, unknown> }) {
    return this.registry.issueAttestation(input)
  }
}
```

```ts
export class Hoshi {
  public readonly kya: KyaClient

  constructor(options: HoshiOptions = {}) {
    this.kya = new KyaClient(new InMemoryKyaRegistry(), () => this.address)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @hoshi/sdk test -- kya-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/hoshi-sdk/src/kya/local-registry.ts packages/hoshi-sdk/src/kya/client.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/src/index.ts packages/hoshi-sdk/test/kya-client.test.ts
git commit -m "feat: add Hoshi KYA registry client"
```

### Task 3: Rename wallet auth to PIN and keep host-managed unlock flow

**Files:**
- Modify: `packages/hoshi-sdk/src/adapters/solana/encrypted-keypair-vault.ts:18-295`
- Modify: `packages/hoshi-sdk/src/hoshi.ts:104-312`
- Modify: `packages/hoshi-sdk/test/hoshi-wallet.test.ts:1-83`
- Modify: `packages/hoshi-sdk/src/index.ts:58-65`

- [ ] **Step 1: Write the failing test**

```ts
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
    hoshi = new Hoshi({ keyPath: directory, storage })
  })

  afterEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true })
  })

  it('requires a pin, not a password', async () => {
    await expect(hoshi.createWallet({ label: 'Agent Wallet' } as any)).rejects.toMatchObject({
      code: 'INVALID_PIN',
    })
  })

  it('creates and loads the wallet with pin-based unlock', async () => {
    const created = await hoshi.createWallet({ pin: '12345678', label: 'Agent Wallet' })
    const loaded = await hoshi.loadWallet(created.walletId, '12345678')

    expect(loaded?.id).toBe(created.walletId)
    expect(hoshi.signer?.publicKey).toBe(created.publicKey)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @hoshi/sdk test -- hoshi-wallet.test.ts`
Expected: FAIL because `createWallet` and `loadWallet` still speak in password terms.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface CreateWalletInput {
  pin: string
  label?: string
  cluster?: 'devnet' | 'mainnet'
}
```

```ts
export interface CreateKeystoreInput {
  walletId: string
  pin: string
  label?: string
  defaultCluster?: 'devnet' | 'mainnet'
}
```

```ts
const pin = input.pin
if (typeof pin !== 'string' || pin.trim().length < 4) {
  throw new HoshiError('INVALID_PIN', 'Wallet PIN is required')
}
```

```ts
const vaultResult = this.vault.create({
  walletId,
  pin,
  label: input.label,
  defaultCluster: input.cluster ?? DEFAULT_NETWORK,
})
```

```ts
async loadWallet(walletId: string, pin: string): Promise<Wallet | null> {
  const walletResult = await this._storage.getWallet(walletId)
  if (!walletResult.ok || !walletResult.value) return null

  const wallet = walletResult.value
  if (!wallet.managed || !wallet.keystoreId) return null

  const unlockResult = this.vault.unlock(wallet.keystoreId, pin)
  if (!unlockResult.ok) return null

  this._signer = unlockResult.value
  this._wallet = wallet
  return wallet
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @hoshi/sdk test -- hoshi-wallet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/hoshi-sdk/src/adapters/solana/encrypted-keypair-vault.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/test/hoshi-wallet.test.ts packages/hoshi-sdk/src/index.ts
git commit -m "feat: switch wallet auth to PIN terminology"
```

### Deferred follow-up: onchain registry program

This plan intentionally stops at the SDK-first slice.

The onchain Solana registry for `.hoshi` ownership, reputation storage, and attestation references should be a separate Rust/Anchor plan once the SDK API is stable. That work will need its own file tree under `programs/hoshi-kya/`, Anchor test coverage, and a dedicated deployment path.
