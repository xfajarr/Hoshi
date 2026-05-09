# Hoshi KYA SDK Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-memory KYA registry with an Anchor-backed client while keeping `Hoshi.kya` stable.

**Architecture:** Keep the public `KyaClient` API unchanged, but swap its backend to a dedicated Anchor adapter that derives PDAs, submits instructions, and maps onchain accounts back into the existing SDK profile shapes. Validate the wiring with SDK tests that run against Anchor localnet so production behavior matches the onchain source of truth.

**Tech Stack:** TypeScript, Vitest, `@coral-xyz/anchor`, existing `@hoshi/sdk` workspace, Anchor localnet.

---

### Task 1: Add Anchor-backed KYA adapter and wire `Hoshi.kya`

**Files:**
- Create: `packages/hoshi-sdk/src/kya/anchor-registry.ts`
- Modify: `packages/hoshi-sdk/src/kya/client.ts`
- Modify: `packages/hoshi-sdk/src/hoshi.ts`
- Modify: `packages/hoshi-sdk/src/kya/index.ts`
- Modify: `packages/hoshi-sdk/src/index.ts`
- Modify: `packages/hoshi-sdk/package.json`
- Test: `packages/hoshi-sdk/test/kya-anchor-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, beforeAll } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('KYA Anchor wiring', () => {
  beforeAll(() => {
    if (!process.env.ANCHOR_PROVIDER_URL) {
      throw new Error('ANCHOR_PROVIDER_URL is required for this test')
    }
  })

  it('claims, resolves, and updates reputation against Anchor localnet', async () => {
    const storage = new InMemoryStorageAdapter()
    const hoshi = new Hoshi({ storage })
    const created = await hoshi.createWallet({ pin: '12345678', label: 'Agent Wallet' })
    await hoshi.loadWallet(created.walletId, '12345678')

    const claimed = await hoshi.kya.claimHandle({
      handle: 'namaagent.hoshi',
      displayName: 'Nama Agent',
    })

    expect(claimed.handle).toBe('namaagent.hoshi')
    expect(claimed.owner).toBe(created.publicKey)

    const resolved = await hoshi.kya.resolveHandle('namaagent.hoshi')
    expect(resolved?.handle).toBe('namaagent.hoshi')

    const attestation = await hoshi.kya.issueAttestation({
      handle: 'namaagent.hoshi',
      type: 'payment.completed',
      payload: { amount: '10', asset: 'SOL' },
    })

    expect(attestation.issuer).toBe('hoshi')
    await expect(hoshi.kya.getProfile('namaagent.hoshi')).resolves.toMatchObject({
      reputation: { attestationCount: 1, score: 1 },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @hoshi/sdk test -- kya-anchor-client.test.ts`
Expected: FAIL because the Anchor-backed adapter does not exist yet.

- [ ] **Step 3: Write minimal Anchor adapter implementation**

```ts
import { PublicKey } from '@solana/web3.js'
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'
import type { KyaProfile } from './local-registry.js'
import { normalizeHoshiHandle } from './namespace.js'
import type { HoshiAttestation } from './types.js'

export interface KyaAnchorClientOptions {
  provider: AnchorProvider
  programId: PublicKey
  walletOwner: () => string | null
}

export class KyaAnchorRegistry {
  constructor(private readonly options: KyaAnchorClientOptions) {}

  private program(): Program<Idl> {
    throw new Error('Not implemented yet')
  }

  async claim(input: { handle: string; displayName: string; owner: string }): Promise<KyaProfile> {
    const handle = normalizeHoshiHandle(input.handle)
    const owner = new PublicKey(input.owner)
    const identity = this.identityPda(handle)
    const walletIndex = this.walletIndexPda(owner)

    await this.program().methods
      .claimHandle(handle, input.displayName, null)
      .accounts({ owner, identity, walletIndex, systemProgram: PublicKey.default })
      .rpc()

    return this.fetchProfile(handle)
  }

  async resolve(handle: string): Promise<KyaProfile | null> {
    return this.fetchProfile(handle)
  }

  async issueAttestation(input: { handle: string; type: string; payload: Record<string, unknown> }): Promise<HoshiAttestation> {
    throw new Error('Not implemented yet')
  }

  async updateReputation(handle: string, delta: number): Promise<KyaProfile | null> {
    throw new Error('Not implemented yet')
  }

  private identityPda(handle: string): PublicKey { throw new Error('Not implemented yet') }
  private walletIndexPda(owner: PublicKey): PublicKey { throw new Error('Not implemented yet') }
  private async fetchProfile(handle: string): Promise<KyaProfile | null> { throw new Error('Not implemented yet') }
}
```

```ts
import { KyaAnchorRegistry } from './anchor-registry.js'

export class KyaClient {
  constructor(
    private readonly registry: KyaAnchorRegistry,
    private readonly getOwner: () => string | null,
  ) {}
}
```

```ts
// in hoshi.ts
this.kya = new KyaClient(
  new KyaAnchorRegistry({
    provider: this._chain as unknown as AnchorProvider,
    programId: new PublicKey(process.env.HOSHI_KYA_PROGRAM_ID ?? '11111111111111111111111111111111'),
    walletOwner: () => this.address,
  }),
  () => this.address,
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @hoshi/sdk test -- kya-anchor-client.test.ts`
Expected: PASS against Anchor localnet.

- [ ] **Step 5: Commit**

```bash
git add packages/hoshi-sdk/src/kya/anchor-registry.ts packages/hoshi-sdk/src/kya/client.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/src/kya/index.ts packages/hoshi-sdk/src/index.ts packages/hoshi-sdk/package.json packages/hoshi-sdk/test/kya-anchor-client.test.ts
git commit -m "feat: wire KYA SDK to Anchor registry"
```

### Task 2: Remove in-memory KYA registry from production path

**Files:**
- Delete: `packages/hoshi-sdk/src/kya/local-registry.ts`
- Modify: `packages/hoshi-sdk/src/kya/index.ts`
- Modify: `packages/hoshi-sdk/src/index.ts`
- Modify: `packages/hoshi-sdk/test/kya-client.test.ts`

- [ ] **Step 1: Write the failing test update**

```ts
import { describe, expect, it } from 'vitest'
import { Hoshi } from '../src/index.js'

describe('Hoshi KYA client', () => {
  it('uses the Anchor-backed registry and keeps the same public API', async () => {
    const hoshi = new Hoshi()
    expect(hoshi.kya.claimHandle).toBeTypeOf('function')
    expect(hoshi.kya.resolveHandle).toBeTypeOf('function')
    expect(hoshi.kya.updateReputation).toBeTypeOf('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @hoshi/sdk test -- kya-client.test.ts`
Expected: FAIL if the old in-memory registry is still exported or constructed.

- [ ] **Step 3: Remove the old backend from exports**

```ts
// packages/hoshi-sdk/src/kya/index.ts
export * from './namespace.js'
export * from './client.js'
export * from './anchor-registry.js'
export * from './types.js'
```

```ts
// packages/hoshi-sdk/src/index.ts
export * from './kya/index.js'
```

```ts
// delete packages/hoshi-sdk/src/kya/local-registry.ts
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @hoshi/sdk test -- kya-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/hoshi-sdk/src/kya/index.ts packages/hoshi-sdk/src/index.ts packages/hoshi-sdk/test/kya-client.test.ts
git rm packages/hoshi-sdk/src/kya/local-registry.ts
git commit -m "chore: remove in-memory KYA registry path"
```

### Task 3: Add Anchor localnet integration coverage

**Files:**
- Create: `packages/hoshi-sdk/test/kya-anchor-localnet.test.ts`
- Modify: `packages/hoshi-sdk/package.json`
- Modify: `docs/superpowers/specs/2026-05-09-hoshi-kya-sdk-wiring-design.md` if behavior changed during implementation

- [ ] **Step 1: Write the failing localnet test**

```ts
import { describe, expect, it } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('KYA Anchor localnet', () => {
  it('rejects a second handle for the same wallet', async () => {
    const storage = new InMemoryStorageAdapter()
    const hoshi = new Hoshi({ storage })
    const created = await hoshi.createWallet({ pin: '12345678', label: 'Agent Wallet' })
    await hoshi.loadWallet(created.walletId, '12345678')

    await hoshi.kya.claimHandle({ handle: 'namaagent.hoshi', displayName: 'Nama Agent' })

    await expect(
      hoshi.kya.claimHandle({ handle: 'otheragent.hoshi', displayName: 'Other Agent' })
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @hoshi/sdk test -- kya-anchor-localnet.test.ts`
Expected: FAIL because localnet wiring is not fully covered yet.

- [ ] **Step 3: Add the localnet test script**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:kya:localnet": "vitest run test/kya-anchor-client.test.ts test/kya-anchor-localnet.test.ts"
  }
}
```

- [ ] **Step 4: Run the localnet test script**

Run: `pnpm --filter @hoshi/sdk test:kya:localnet`
Expected: PASS against Anchor localnet.

- [ ] **Step 5: Commit**

```bash
git add packages/hoshi-sdk/test/kya-anchor-localnet.test.ts packages/hoshi-sdk/package.json
git commit -m "test: add Anchor localnet coverage for KYA"
```

### Deferred follow-up: program-specific SDK polish

If the Anchor program account layout changes, update the mapping tests and adapter methods first before broadening the API surface.
