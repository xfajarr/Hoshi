# Hoshi t2000 Parity Phased Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a phased, production-oriented Hoshi foundation that starts narrow around safe agent payments on Solana, but sets `@hoshi/sdk`, `@hoshi/engine`, and `@hoshi/mcp` up to deepen toward near t2000-style parity over time.

**Architecture:** Keep the external product surface narrow: safe payments for AI agents on Solana with x402 + MPP as the core protocol layer. Implement that through a clean SDK facade, a shared payment model layer, an engine that evolves from policy-only control into a runtime/orchestration package, and an MCP server with a stable startup API and predictable tool semantics.

**Tech Stack:** TypeScript monorepo, pnpm workspaces, Vitest, tsup, zod, `@solana/web3.js`, Hono, existing `@hoshi/sdk`, `@hoshi/engine`, and `@hoshi/mcp` packages.

---

## Implementation Notes

- Target phased vertical slices, not full t2000 parity in one pass.
- Preserve narrow messaging: safe payments for AI agents on Solana.
- Treat x402 + MPP as core now; keep APP explicitly deferred.
- Prefer additive internal architecture changes that preserve stable public entrypoints where possible.
- Each task below is self-contained, testable, and ends at a commit checkpoint.

## File Structure

### Existing files to modify

- Modify: `packages/hoshi-sdk/src/hoshi.ts`
  Purpose: simplify the SDK facade, fix wallet create/load semantics, and expose a payment-first API surface without leaking internal service wiring.
- Modify: `packages/hoshi-sdk/src/index.ts`
  Purpose: re-export the new payment model and facade entrypoints from one stable package root.
- Modify: `packages/hoshi-sdk/src/core/types.ts`
  Purpose: add or tighten shared payment-facing domain types used by SDK, engine, and MCP.
- Modify: `packages/hoshi-sdk/src/ports/storage.ts`
  Purpose: add storage methods needed for payment requests, invoices, links, and payment state transitions.
- Modify: `packages/hoshi-sdk/src/services/wallet.ts`
  Purpose: fix wallet record creation and loading boundaries so managed wallets, imported wallets, and signer attachment are explicit and testable.
- Modify: `packages/hoshi-sdk/src/services/invoice.ts`
  Purpose: narrow invoice/link behavior around “get paid” flows and move URL generation onto shared payment primitives.
- Modify: `packages/hoshi-engine/src/index.ts`
  Purpose: export the new runtime/orchestration primitives without breaking current policy imports.
- Modify: `packages/hoshi-engine/src/core/types.ts`
  Purpose: add runtime event, action, execution state, and orchestration result types.
- Modify: `packages/hoshi-engine/src/services/executor.ts`
  Purpose: keep current policy enforcement but route execution through a runtime-friendly abstraction.
- Modify: `packages/hoshi-mcp/src/index.ts`
  Purpose: export a stable startup API instead of making `src/server.ts` the only usable surface.
- Modify: `packages/hoshi-mcp/src/server.ts`
  Purpose: keep CLI bootstrap thin and delegate initialization and transport wiring into library code.
- Modify: `packages/hoshi-mcp/src/core/server.ts`
  Purpose: stop building the full product surface inline and instead compose SDK + engine startup primitives.
- Modify: `packages/hoshi-mcp/src/handlers/financial.ts`
  Purpose: clean up tool naming, remove private-property reach-ins, and align tool behavior with the narrowed payment product surface.
- Modify: `packages/hoshi-sdk/test/core.test.ts`
  Purpose: cover shared type/result behavior that now underpins the payment model layer.
- Modify: `packages/hoshi-sdk/test/integration.test.ts`
  Purpose: evolve current integration coverage toward payment-first scenarios.
- Modify: `packages/hoshi-engine/test/engine.test.ts`
  Purpose: preserve current policy coverage while adding runtime/orchestration slices.
- Modify: `packages/hoshi-mcp/test/mcp.test.ts`
  Purpose: assert stable startup and stable tool-list behavior.
- Modify: `README.md`
  Purpose: align top-level developer narrative with the approved positioning and the phased package model.

### New files to create

- Create: `packages/hoshi-sdk/src/payments/types.ts`
  Purpose: canonical x402/MPP payment request, payment method, receipt, invoice, and receive-flow types.
- Create: `packages/hoshi-sdk/src/payments/x402.ts`
  Purpose: x402-specific helpers for serializing payment requirements and payment responses.
- Create: `packages/hoshi-sdk/src/payments/mpp.ts`
  Purpose: MPP-specific helpers for payment intents, metadata, and transport-safe payloads.
- Create: `packages/hoshi-sdk/src/services/payments.ts`
  Purpose: payment-first SDK service for `pay`, `receive`, `createInvoice`, and `createPaymentLink` workflows.
- Create: `packages/hoshi-sdk/test/wallet-facade.test.ts`
  Purpose: focused tests for wallet creation, managed wallet loading, and signer attachment.
- Create: `packages/hoshi-sdk/test/payments.test.ts`
  Purpose: focused tests for pay/get-paid concepts and shared x402/MPP behavior.
- Create: `packages/hoshi-engine/src/runtime/types.ts`
  Purpose: QueryEngine-style runtime types for events, jobs, effects, and loop state.
- Create: `packages/hoshi-engine/src/runtime/loop.ts`
  Purpose: minimal event loop that can preview, approve, and execute one payment action at a time.
- Create: `packages/hoshi-engine/src/runtime/orchestrator.ts`
  Purpose: orchestration entrypoint that wraps policy + execution into a runtime-oriented API.
- Create: `packages/hoshi-engine/src/ports/runtime-store.ts`
  Purpose: persistence boundary for runtime jobs, events, and statuses.
- Create: `packages/hoshi-engine/src/adapters/memory-runtime-store.ts`
  Purpose: in-memory implementation for runtime tests and MCP local usage.
- Create: `packages/hoshi-engine/test/runtime.test.ts`
  Purpose: isolated tests for the event loop slice.
- Create: `packages/hoshi-mcp/src/app.ts`
  Purpose: stable public startup API such as `createHoshiMcpServer()` and `startHoshiMcpServer()`.
- Create: `packages/hoshi-mcp/src/handlers/payments.ts`
  Purpose: payment-focused MCP tools split away from broader “financial” concerns.
- Create: `packages/hoshi-mcp/src/core/tool-catalog.ts`
  Purpose: deterministic tool registration and metadata assembly without global mutation leaks.
- Create: `packages/hoshi-mcp/test/startup.test.ts`
  Purpose: startup API and transport initialization tests.
- Create: `packages/hoshi-mcp/test/e2e-payment-flow.test.ts`
  Purpose: end-to-end MCP-to-engine-to-SDK payment flow test using in-memory dependencies.
- Create: `docs/superpowers/plans/README.md`
  Purpose: short index for implementation plans and execution expectations.

## Phase 1: SDK Facade and Payment Foundation

### Task 1: Harden the SDK facade and fix wallet creation/load semantics

**Files:**
- Modify: `packages/hoshi-sdk/src/hoshi.ts`
- Modify: `packages/hoshi-sdk/src/services/wallet.ts`
- Modify: `packages/hoshi-sdk/src/index.ts`
- Create: `packages/hoshi-sdk/test/wallet-facade.test.ts`
- Modify: `packages/hoshi-sdk/test/integration.test.ts`

- [ ] **Step 1: Write focused wallet facade tests before changing the API**

```ts
import { describe, it, expect } from 'vitest'
import { Hoshi, InMemoryStorageAdapter, Result } from '../src/index.js'

describe('Hoshi wallet facade', () => {
  it('creates a managed wallet record and returns the persisted wallet id', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const created = await sdk.createWallet({ label: 'Agent Treasury', cluster: 'devnet', password: 'secret123' })

    expect(created.walletId).toMatch(/[0-9a-f-]{36}/)
    expect(created.publicKey.length).toBeGreaterThan(30)
  })

  it('does not mark a wallet as loaded until signer unlock succeeds', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const created = await sdk.createWallet({ label: 'Locked Wallet', cluster: 'devnet', password: 'secret123' })

    const wallet = await sdk.loadWallet(created.walletId, 'wrong-password')
    expect(wallet).toBeNull()
    expect(sdk.wallet).toBeNull()
    expect(sdk.signer).toBeNull()
  })
})
```

- [ ] **Step 2: Run the SDK wallet tests and current integration tests to capture baseline failures**

Run: `pnpm --filter @hoshi/sdk test -- test/wallet-facade.test.ts test/integration.test.ts`
Expected: the new wallet-facade test fails because `createWallet` hardcodes an empty password path and the load behavior is too loose.

- [ ] **Step 3: Make managed wallet lifecycle explicit in the facade**

```ts
export interface CreateManagedWalletInput {
  label?: string
  cluster?: 'devnet' | 'mainnet'
  password: string
}

export interface LoadWalletInput {
  walletId: string
  password: string
}

async createWallet(input: CreateManagedWalletInput): Promise<{ walletId: string; publicKey: string }> {
  const vaultResult = this.vault.create({
    walletId,
    password: input.password,
    label: input.label,
    defaultCluster: input.cluster ?? DEFAULT_NETWORK,
  })

  // Persist only after vault creation succeeds.
}
```

- [ ] **Step 4: Tighten `WalletService` around explicit managed/imported wallet creation paths**

```ts
export interface CreateWalletInput {
  id?: string
  publicKey: string
  label?: string
  source?: 'managed' | 'imported' | 'external'
  managed?: boolean
  keystoreId?: string
  defaultCluster?: 'devnet' | 'mainnet'
}

const managed = input.source === 'managed' || input.managed === true
if (managed && !input.keystoreId) {
  return R.err(new ValidationError('Managed wallets require a keystoreId'))
}
```

- [ ] **Step 5: Verify wallet tests, then run package typecheck and build**

Run: `pnpm --filter @hoshi/sdk test -- test/wallet-facade.test.ts test/integration.test.ts`
Expected: PASS

Run: `pnpm --filter @hoshi/sdk typecheck`
Expected: PASS

Run: `pnpm --filter @hoshi/sdk build`
Expected: PASS

- [ ] **Step 6: Commit the wallet-facade slice**

```bash
git add packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/src/services/wallet.ts packages/hoshi-sdk/src/index.ts packages/hoshi-sdk/test/wallet-facade.test.ts packages/hoshi-sdk/test/integration.test.ts
git commit -m "feat: harden hoshi sdk wallet facade"
```

### Task 2: Add a payment-first SDK surface for pay/get-paid flows

**Files:**
- Create: `packages/hoshi-sdk/src/services/payments.ts`
- Modify: `packages/hoshi-sdk/src/hoshi.ts`
- Modify: `packages/hoshi-sdk/src/services/invoice.ts`
- Modify: `packages/hoshi-sdk/src/index.ts`
- Create: `packages/hoshi-sdk/test/payments.test.ts`
- Modify: `packages/hoshi-sdk/test/integration.test.ts`

- [ ] **Step 1: Write failing tests for `pay`, `receive`, `createInvoice`, and `createPaymentLink` as first-class SDK concepts**

```ts
import { describe, it, expect } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('SDK payment surface', () => {
  it('creates an inbound receive request with invoice semantics', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const { walletId } = await sdk.createWallet({ label: 'Receiver', cluster: 'devnet', password: 'secret123' })

    const invoice = await sdk.receive({
      walletId,
      amount: '25',
      asset: 'USDC',
      description: 'Agent completion reward',
    })

    expect(invoice.kind).toBe('invoice')
    expect(invoice.protocols).toEqual(expect.arrayContaining(['x402', 'mpp']))
  })

  it('normalizes payment link output for get-paid flows', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const { walletId } = await sdk.createWallet({ label: 'Seller', cluster: 'devnet', password: 'secret123' })

    const link = await sdk.createPaymentLink({
      walletId,
      amount: '49.99',
      asset: 'USDC',
      description: 'agent subscription',
    })

    expect(link.kind).toBe('payment_link')
    expect(link.url).toContain('https://pay.hoshi.ai/p/')
    expect(link.protocols).toEqual(['x402', 'mpp'])
  })
})
```

- [ ] **Step 2: Run the targeted payment tests**

Run: `pnpm --filter @hoshi/sdk test -- test/payments.test.ts`
Expected: FAIL because `Hoshi` exposes low-level invoice methods but not the planned payment-first surface.

- [ ] **Step 3: Introduce a small `PaymentsService` and keep the facade narrow**

```ts
export class PaymentsService {
  constructor(
    private readonly storage: StoragePort,
    private readonly transferService: TransferService,
    private readonly invoiceService: InvoiceService,
  ) {}

  async receive(input: ReceivePaymentInput): Promise<Result<ReceivePayment, Error>> {
    return this.invoiceService.createInvoice({
      walletId: input.walletId,
      amount: { amount: input.amount, asset: input.asset },
      description: input.description,
    })
  }
}
```

- [ ] **Step 4: Clean invoice and payment-link generation so both map onto the same “get paid” model**

```ts
const paymentPath = input.kind === 'invoice' ? 'i' : 'p'
const paymentRef = crypto.randomUUID()

return {
  ...base,
  url: `https://pay.hoshi.ai/${paymentPath}/${paymentRef}`,
  protocols: ['x402', 'mpp'],
}
```

- [ ] **Step 5: Expose stable facade methods and preserve existing low-level services underneath**

```ts
async pay(input: { to: string; amount: string; asset: 'SOL' | 'USDC' }) {
  return this.transfer(input)
}

async receive(input: { walletId: string; amount: string; asset: 'SOL' | 'USDC'; description: string }) {
  return this._paymentsService.receive(input)
}
```

- [ ] **Step 6: Run payment tests, integration tests, typecheck, and build**

Run: `pnpm --filter @hoshi/sdk test -- test/payments.test.ts test/integration.test.ts`
Expected: PASS

Run: `pnpm --filter @hoshi/sdk typecheck`
Expected: PASS

Run: `pnpm --filter @hoshi/sdk build`
Expected: PASS

- [ ] **Step 7: Commit the payment-surface slice**

```bash
git add packages/hoshi-sdk/src/services/payments.ts packages/hoshi-sdk/src/services/invoice.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/src/index.ts packages/hoshi-sdk/test/payments.test.ts packages/hoshi-sdk/test/integration.test.ts
git commit -m "feat: add payment-first sdk surface"
```

### Task 3: Add the shared x402/MPP payment model layer

**Files:**
- Create: `packages/hoshi-sdk/src/payments/types.ts`
- Create: `packages/hoshi-sdk/src/payments/x402.ts`
- Create: `packages/hoshi-sdk/src/payments/mpp.ts`
- Modify: `packages/hoshi-sdk/src/core/types.ts`
- Modify: `packages/hoshi-sdk/src/index.ts`
- Modify: `packages/hoshi-sdk/test/core.test.ts`
- Modify: `packages/hoshi-sdk/test/payments.test.ts`

- [ ] **Step 1: Write failing tests for protocol-normalized payment models**

```ts
import { describe, it, expect } from 'vitest'
import { toX402PaymentRequirement, toMppPaymentIntent } from '../src/index.js'

describe('shared payment model layer', () => {
  it('serializes an invoice into an x402 payment requirement', () => {
    const requirement = toX402PaymentRequirement({
      id: 'req_123',
      amount: { amount: '10', asset: 'USDC' },
      recipient: 'ReceiverPubkey1111111111111111111111111111',
      memo: 'agent task',
    })

    expect(requirement.scheme).toBe('x402')
    expect(requirement.amount.asset).toBe('USDC')
  })

  it('serializes a receive flow into an MPP payment intent', () => {
    const intent = toMppPaymentIntent({
      id: 'intent_123',
      amount: { amount: '5', asset: 'SOL' },
      recipient: 'ReceiverPubkey1111111111111111111111111111',
    })

    expect(intent.scheme).toBe('mpp')
  })
})
```

- [ ] **Step 2: Run the shared payment model tests**

Run: `pnpm --filter @hoshi/sdk test -- test/core.test.ts test/payments.test.ts`
Expected: FAIL because shared payment model helpers do not exist yet.

- [ ] **Step 3: Define canonical payment types once and reuse them everywhere**

```ts
export type PaymentProtocol = 'x402' | 'mpp'

export interface HoshiPaymentRequest {
  id: string
  protocol: PaymentProtocol
  amount: Money
  recipient: string
  memo?: string
  metadata?: Record<string, unknown>
}

export interface ReceivePayment {
  kind: 'invoice' | 'payment_link'
  protocols: PaymentProtocol[]
  url: string
}
```

- [ ] **Step 4: Add x402 and MPP helpers as pure serialization modules**

```ts
export function toX402PaymentRequirement(input: HoshiPaymentRequest) {
  return {
    scheme: 'x402',
    requestId: input.id,
    amount: input.amount,
    recipient: input.recipient,
    memo: input.memo,
  }
}

export function toMppPaymentIntent(input: HoshiPaymentRequest) {
  return {
    scheme: 'mpp',
    intentId: input.id,
    amount: input.amount,
    recipient: input.recipient,
    metadata: input.metadata ?? {},
  }
}
```

- [ ] **Step 5: Re-export the shared model layer from the SDK root and wire the payment service to use it**

Run: `pnpm --filter @hoshi/sdk test -- test/core.test.ts test/payments.test.ts test/integration.test.ts`
Expected: PASS

Run: `pnpm --filter @hoshi/sdk typecheck`
Expected: PASS

Run: `pnpm --filter @hoshi/sdk build`
Expected: PASS

- [ ] **Step 6: Commit the shared payment model slice**

```bash
git add packages/hoshi-sdk/src/payments/types.ts packages/hoshi-sdk/src/payments/x402.ts packages/hoshi-sdk/src/payments/mpp.ts packages/hoshi-sdk/src/core/types.ts packages/hoshi-sdk/src/index.ts packages/hoshi-sdk/test/core.test.ts packages/hoshi-sdk/test/payments.test.ts
git commit -m "feat: add shared x402 and mpp payment models"
```

## Phase 2: Engine Runtime Evolution

### Task 4: Restructure `@hoshi/engine` toward runtime and orchestration primitives

**Files:**
- Create: `packages/hoshi-engine/src/runtime/types.ts`
- Create: `packages/hoshi-engine/src/runtime/orchestrator.ts`
- Create: `packages/hoshi-engine/src/ports/runtime-store.ts`
- Create: `packages/hoshi-engine/src/adapters/memory-runtime-store.ts`
- Modify: `packages/hoshi-engine/src/core/types.ts`
- Modify: `packages/hoshi-engine/src/index.ts`
- Modify: `packages/hoshi-engine/test/engine.test.ts`

- [ ] **Step 1: Add failing tests that describe the runtime-oriented API without replacing policy behavior**

```ts
import { describe, it, expect } from 'vitest'
import { PaymentRuntimeOrchestrator, InMemoryRuntimeStore, InMemoryPolicyStore, InMemoryApprovalStore } from '../src/index.js'

describe('engine runtime surface', () => {
  it('creates a runtime job for a payment action preview', async () => {
    const orchestrator = new PaymentRuntimeOrchestrator({
      policyStore: new InMemoryPolicyStore(),
      approvalStore: new InMemoryApprovalStore(),
      runtimeStore: new InMemoryRuntimeStore(),
    })

    const job = await orchestrator.createJob({
      walletId: 'w1',
      actionType: 'transfer.send',
      params: { amount: { amount: '10', asset: 'USDC' }, to: 'recipient' },
    })

    expect(job.status).toBe('queued')
  })
})
```

- [ ] **Step 2: Run the engine tests to capture the missing runtime layer**

Run: `pnpm --filter @hoshi/engine test -- test/engine.test.ts`
Expected: FAIL because runtime/orchestrator exports do not exist.

- [ ] **Step 3: Add runtime data structures without disturbing the current policy API**

```ts
export interface RuntimeJob {
  id: string
  walletId: string
  actionType: string
  params: Record<string, unknown>
  status: 'queued' | 'previewed' | 'awaiting_approval' | 'executing' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 4: Add an in-memory runtime store and minimal orchestrator entrypoint**

```ts
export class PaymentRuntimeOrchestrator {
  async createJob(input: ExecuteOptions): Promise<RuntimeJob> {
    const job = { ...input, id: crypto.randomUUID(), status: 'queued', createdAt: now, updatedAt: now }
    await this.runtimeStore.putJob(job)
    return job
  }
}
```

- [ ] **Step 5: Export the runtime primitives from `@hoshi/engine` and verify compatibility**

Run: `pnpm --filter @hoshi/engine test -- test/engine.test.ts`
Expected: PASS

Run: `pnpm --filter @hoshi/engine typecheck`
Expected: PASS

Run: `pnpm --filter @hoshi/engine build`
Expected: PASS

- [ ] **Step 6: Commit the engine restructure slice**

```bash
git add packages/hoshi-engine/src/runtime/types.ts packages/hoshi-engine/src/runtime/orchestrator.ts packages/hoshi-engine/src/ports/runtime-store.ts packages/hoshi-engine/src/adapters/memory-runtime-store.ts packages/hoshi-engine/src/core/types.ts packages/hoshi-engine/src/index.ts packages/hoshi-engine/test/engine.test.ts
git commit -m "refactor: prepare engine runtime primitives"
```

### Task 5: Add a minimal QueryEngine-style event loop slice for Hoshi payments

**Files:**
- Create: `packages/hoshi-engine/src/runtime/loop.ts`
- Modify: `packages/hoshi-engine/src/services/executor.ts`
- Create: `packages/hoshi-engine/test/runtime.test.ts`
- Modify: `packages/hoshi-engine/test/engine.test.ts`

- [ ] **Step 1: Write failing tests for a one-job event loop that can preview, escalate, and execute**

```ts
import { describe, it, expect } from 'vitest'
import {
  PaymentEventLoop,
  ExecutionService,
  PolicyEngine,
  InMemoryPolicyStore,
  InMemoryApprovalStore,
  InMemoryRuntimeStore,
  Result,
} from '../src/index.js'

describe('PaymentEventLoop', () => {
  it('moves a safe payment job from queued to completed', async () => {
    const executionService = new ExecutionService(
      new PolicyEngine(new InMemoryPolicyStore()),
      new InMemoryApprovalStore(),
    )

    const loop = new PaymentEventLoop({
      executionService,
      runtimeStore: new InMemoryRuntimeStore(),
    })
    const job = await loop.enqueue({
      walletId: 'w1',
      actionType: 'balance.read',
      params: {},
    })

    const result = await loop.tick(job.id, async () => Result.ok({ ok: true }))
    expect(result.status).toBe('completed')
  })

  it('moves an escalated payment job into awaiting_approval', async () => {
    const policyStore = new InMemoryPolicyStore()
    await policyStore.saveRules('w1', [{
      id: 'r1',
      name: 'Large transfer',
      enabled: true,
      priority: 1,
      condition: { type: 'max_amount', params: { max: 100 } },
      action: 'escalate',
    }])

    const executionService = new ExecutionService(
      new PolicyEngine(policyStore),
      new InMemoryApprovalStore(),
    )

    const loop = new PaymentEventLoop({
      executionService,
      runtimeStore: new InMemoryRuntimeStore(),
    })

    const job = await loop.enqueue({
      walletId: 'w1',
      actionType: 'transfer.send',
      params: { amount: { amount: '150', asset: 'USDC' }, to: 'recipient' },
    })

    const result = await loop.tick(job.id, async () => Result.ok({ ok: true }))
    expect(result.status).toBe('awaiting_approval')
    expect(result.approvalId).toBeDefined()
  })
})
```

- [ ] **Step 2: Run runtime-specific engine tests**

Run: `pnpm --filter @hoshi/engine test -- test/runtime.test.ts`
Expected: FAIL because no event loop exists.

- [ ] **Step 3: Implement the smallest useful loop around `ExecutionService`**

```ts
export class PaymentEventLoop {
  async tick<T>(jobId: string, executor: () => Promise<Result<T, Error>>) {
    const job = await this.runtimeStore.getJob(jobId)
    const result = await this.executionService.execute(jobToExecuteOptions(job), executor)

    if (!result.ok) return this.runtimeStore.fail(jobId, result.error)
    if (result.value.approvalId) return this.runtimeStore.awaitApproval(jobId, result.value.approvalId)
    if (!result.value.success) return this.runtimeStore.fail(jobId, result.value.error)
    return this.runtimeStore.complete(jobId, result.value.value)
  }
}
```

- [ ] **Step 4: Keep the event loop payment-specific and intentionally minimal**

Run: `pnpm --filter @hoshi/engine test -- test/runtime.test.ts test/engine.test.ts`
Expected: PASS

Run: `pnpm --filter @hoshi/engine typecheck`
Expected: PASS

Run: `pnpm --filter @hoshi/engine build`
Expected: PASS

- [ ] **Step 5: Commit the minimal runtime loop slice**

```bash
git add packages/hoshi-engine/src/runtime/loop.ts packages/hoshi-engine/src/services/executor.ts packages/hoshi-engine/test/runtime.test.ts packages/hoshi-engine/test/engine.test.ts
git commit -m "feat: add minimal payment event loop"
```

## Phase 3: MCP as a First-Class Product Surface

### Task 6: Clean up the MCP tool surface and introduce a stable startup API

**Files:**
- Create: `packages/hoshi-mcp/src/app.ts`
- Create: `packages/hoshi-mcp/src/core/tool-catalog.ts`
- Create: `packages/hoshi-mcp/src/handlers/payments.ts`
- Modify: `packages/hoshi-mcp/src/index.ts`
- Modify: `packages/hoshi-mcp/src/server.ts`
- Modify: `packages/hoshi-mcp/src/core/server.ts`
- Modify: `packages/hoshi-mcp/src/handlers/financial.ts`
- Create: `packages/hoshi-mcp/test/startup.test.ts`
- Modify: `packages/hoshi-mcp/test/mcp.test.ts`

- [ ] **Step 1: Add failing tests for startup and deterministic tool registration**

```ts
import { describe, it, expect } from 'vitest'
import { createHoshiMcpServer } from '../src/index.js'

describe('Hoshi MCP startup API', () => {
  it('creates a server instance without mutating a global tool registry across tests', async () => {
    const server = await createHoshiMcpServer({ transport: 'stdio', policyEnabled: false })
    const tools = server.listTools()

    expect(tools.map((tool) => tool.name)).toContain('hoshi_payments_receive')
  })
})
```

- [ ] **Step 2: Run MCP tests to confirm the missing startup API and unstable registry behavior**

Run: `pnpm --filter @hoshi/mcp test -- test/startup.test.ts test/mcp.test.ts`
Expected: FAIL because startup is CLI-only and tools are still registered through a shared mutable registry.

- [ ] **Step 3: Extract a library-grade startup API from the CLI wrapper**

```ts
export async function createHoshiMcpServer(overrides?: Partial<ServerConfig>) {
  const config = { ...loadConfig(), ...overrides }
  const context = await createServerContext(config)
  const catalog = createToolCatalog(context)

  return {
    config,
    context,
    listTools: () => catalog.list(),
    handleRequest: (req: JSONRPCRequest) => handleRequest(req, catalog, context),
    start: () => startTransport(config, context, catalog),
  }
}
```

- [ ] **Step 4: Split payment-first tools out of the generic financial handler and align names with the product story**

```ts
registerTool({
  name: 'hoshi_payments_receive',
  description: 'Create a get-paid request for an AI agent on Solana',
  category: 'write_safe',
})

registerTool({
  name: 'hoshi_payments_pay',
  description: 'Pay from an agent wallet with policy-aware execution',
  category: 'write_escalated',
})
```

- [ ] **Step 5: Remove private-property reach-ins and rely on explicit SDK/engine APIs instead**

```ts
// Replace walletService['storage'] and walletService['chain'] access
const history = await context.storage.getReceipts(walletId)
const balances = await context.walletService.getBalances(walletId)
```

- [ ] **Step 6: Verify MCP tests, typecheck, and build**

Run: `pnpm --filter @hoshi/mcp test -- test/startup.test.ts test/mcp.test.ts`
Expected: PASS

Run: `pnpm --filter @hoshi/mcp typecheck`
Expected: PASS

Run: `pnpm --filter @hoshi/mcp build`
Expected: PASS

- [ ] **Step 7: Commit the MCP startup/tool-surface slice**

```bash
git add packages/hoshi-mcp/src/app.ts packages/hoshi-mcp/src/core/tool-catalog.ts packages/hoshi-mcp/src/handlers/payments.ts packages/hoshi-mcp/src/index.ts packages/hoshi-mcp/src/server.ts packages/hoshi-mcp/src/core/server.ts packages/hoshi-mcp/src/handlers/financial.ts packages/hoshi-mcp/test/startup.test.ts packages/hoshi-mcp/test/mcp.test.ts
git commit -m "feat: stabilize hoshi mcp startup and payment tools"
```

## Phase 4: End-to-End Validation and Docs Alignment

### Task 7: Add cross-package end-to-end coverage and align docs to the approved story

**Files:**
- Create: `packages/hoshi-mcp/test/e2e-payment-flow.test.ts`
- Modify: `packages/hoshi-sdk/test/integration.test.ts`
- Modify: `packages/hoshi-engine/test/runtime.test.ts`
- Modify: `README.md`
- Create: `docs/superpowers/plans/README.md`

- [ ] **Step 1: Write a failing end-to-end test from MCP request to engine policy to SDK payment response**

```ts
import { describe, it, expect } from 'vitest'
import { createHoshiMcpServer } from '../src/index.js'

describe('MCP end-to-end payment flow', () => {
  it('creates a receive request through MCP and returns a payment URL plus protocol metadata', async () => {
    const server = await createHoshiMcpServer({ policyEnabled: true, transport: 'stdio' })

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'hoshi_payments_receive',
        arguments: {
          walletId: 'test-wallet-id',
          amount: '15',
          asset: 'USDC',
          description: 'agent task payout',
        },
      },
    })

    expect(response.error).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run package-scoped tests first, then a filtered workspace validation pass**

Run: `pnpm --filter @hoshi/mcp test -- test/e2e-payment-flow.test.ts`
Expected: FAIL until startup, policy, and payment layers are wired together correctly.

- [ ] **Step 3: Fix any cross-package seams with the smallest glue changes necessary**

```ts
// Expected shape: MCP -> engine runtime -> SDK payment service
const runtime = new PaymentEventLoop({ executionService, runtimeStore })
const result = await runtime.tick(job.id, () => context.paymentsService.receive(normalizedArgs))
```

- [ ] **Step 4: Update the root docs to match approved positioning and phased package responsibilities**

```md
## Hoshi

Safe payments for AI agents.

Hoshi helps AI agents pay safely and get paid on Solana. The current architecture ships in phases across:

- `@hoshi/sdk`: payment-first developer facade
- `@hoshi/engine`: policy and runtime orchestration
- `@hoshi/mcp`: stable tool surface for agent environments
```

- [ ] **Step 5: Run package validation and workspace validation**

Run: `pnpm --filter @hoshi/sdk test`
Expected: PASS

Run: `pnpm --filter @hoshi/engine test`
Expected: PASS

Run: `pnpm --filter @hoshi/mcp test`
Expected: PASS

Run: `pnpm --filter @hoshi/sdk typecheck && pnpm --filter @hoshi/engine typecheck && pnpm --filter @hoshi/mcp typecheck`
Expected: PASS

Run: `pnpm --filter @hoshi/sdk build && pnpm --filter @hoshi/engine build && pnpm --filter @hoshi/mcp build`
Expected: PASS

- [ ] **Step 6: Commit the end-to-end and docs alignment slice**

```bash
git add packages/hoshi-mcp/test/e2e-payment-flow.test.ts packages/hoshi-sdk/test/integration.test.ts packages/hoshi-engine/test/runtime.test.ts README.md docs/superpowers/plans/README.md
git commit -m "test: add end-to-end payment coverage and align docs"
```

## Phase 5: Deferred Expansion Phases

### Task 8: Record deferred APP plugin and broader commerce phases without mixing them into v1 delivery

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/plans/README.md`

- [ ] **Step 1: Add a short deferred-phase section to docs so future work has a clean boundary**

```md
## Deferred after v1 foundation

- APP plugin layer for optional routing/orchestration integrations
- Richer commerce flows: negotiation, shopping, escrow
- Multi-step agent-to-agent commerce coordination
- Broader MCP tool packs after payment primitives are stable
```

- [ ] **Step 2: Make the deferral explicit in code-adjacent docs, not in the shipped runtime path**

Run: `pnpm --filter @hoshi/sdk test`
Expected: PASS

Run: `pnpm --filter @hoshi/engine test`
Expected: PASS

Run: `pnpm --filter @hoshi/mcp test`
Expected: PASS

- [ ] **Step 3: Commit the deferred roadmap boundary**

```bash
git add README.md docs/superpowers/plans/README.md
git commit -m "docs: record deferred app and commerce phases"
```

## Milestone Checkpoints

- After Task 1: SDK wallet lifecycle is correct and testable.
- After Task 2: SDK exposes payment-first `pay` / `receive` concepts.
- After Task 3: x402 + MPP models are shared and reusable.
- After Task 4: engine exports runtime/orchestration primitives.
- After Task 5: one-job QueryEngine-style loop works for payment actions.
- After Task 6: MCP has a stable startup API and payment-first tool surface.
- After Task 7: cross-package end-to-end coverage and docs alignment are in place.
- After Task 8: future APP and broader commerce work is clearly deferred instead of leaking into v1 scope.

## Out of Scope for This Plan

- Full t2000 parity in a single release.
- APP as a required base architecture primitive.
- Trading, generic DeFi copilot features, or portfolio tooling.
- Broad autonomous commerce flows such as negotiation, escrow, or shopping.

Plan complete and saved to `docs/superpowers/plans/2026-05-09-hoshi-t2000-parity-phased-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
