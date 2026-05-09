# Hoshi Shared Payment Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement one shared Solana-first payment core that powers protocol-complete x402 and MPP flows across the SDK and MCP server.

**Architecture:** Add a protocol layer under `packages/hoshi-sdk/src/payments/core` for challenges, credentials, receipts, intents, sessions, methods, and verification. Keep x402 as the narrow HTTP 402 profile and MPP as the broader protocol surface; both should delegate to the same shared primitives. MCP should call the SDK core instead of reimplementing payment logic.

**Tech Stack:** TypeScript, Vitest, Hono, Node.js, Solana web3.js, existing Hoshi SDK + MCP packages.

---

### Task 1: Define the shared payment core types and registry

**Files:**
- Create: `packages/hoshi-sdk/src/payments/core/types.ts`
- Create: `packages/hoshi-sdk/src/payments/core/registry.ts`
- Modify: `packages/hoshi-sdk/src/payments/types.ts`
- Modify: `packages/hoshi-sdk/src/index.ts`
- Test: `packages/hoshi-sdk/test/payments-core.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { createPaymentMethodRegistry, createPaymentChallenge } from '../src/index.js'

describe('shared payment core', () => {
  it('creates a charge challenge with expiry and request binding', () => {
    const challenge = createPaymentChallenge({
      protocol: 'x402',
      intent: 'charge',
      method: 'solana',
      resource: 'GET /premium',
      amount: { amount: '0.01', asset: 'USDC' },
      recipient: 'TreasuryPubkey',
      expiresInSeconds: 60,
      requestHash: 'req-hash-1',
    })

    expect(challenge.protocol).toBe('x402')
    expect(challenge.intent).toBe('charge')
    expect(challenge.method).toBe('solana')
    expect(challenge.resource).toBe('GET /premium')
    expect(challenge.expiresAt).toBeTruthy()
    expect(challenge.requestHash).toBe('req-hash-1')
  })

  it('registers a solana payment method', () => {
    const registry = createPaymentMethodRegistry()
    expect(registry.list()).toHaveLength(1)
    expect(registry.get('solana')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `pnpm --filter @hoshi/sdk test -- test/payments-core.test.ts`
Expected: FAIL because the shared payment core exports do not exist yet.

- [ ] **Step 3: Implement the minimal shared types and registry**

```ts
export type PaymentProtocol = 'x402' | 'mpp'
export type PaymentIntent = 'charge' | 'session'
export type PaymentMethodId = 'solana'

export interface PaymentAmount {
  amount: string
  asset: 'SOL' | 'USDC'
}

export interface PaymentChallenge { /* protocol, intent, method, resource, amount, recipient, requestHash, expiresAt, challengeId */ }
export interface PaymentCredential { /* challengeId, protocol, intent, method, payload, requestHash, createdAt */ }
export interface PaymentReceipt { /* receiptId, challengeId, protocol, intent, method, amount, recipient, settledAt, reference */ }
export interface ChargeIntent { /* kind:'charge', resource, amount, recipient */ }
export interface SessionIntent { /* kind:'session', sessionId, funding, remaining, expiresAt */ }
export interface PaymentMethod { /* id, protocol support, createChallenge, createCredential, verifyCredential, createReceipt */ }
```

- [ ] **Step 4: Run the test again**

Run: `pnpm --filter @hoshi/sdk test -- test/payments-core.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/hoshi-sdk/src/payments/core/types.ts packages/hoshi-sdk/src/payments/core/registry.ts packages/hoshi-sdk/src/payments/types.ts packages/hoshi-sdk/src/index.ts packages/hoshi-sdk/test/payments-core.test.ts
git commit -m "feat: add shared payment core primitives"
```

### Task 2: Implement Solana-first x402 and MPP protocol helpers

**Files:**
- Create: `packages/hoshi-sdk/src/payments/core/challenge.ts`
- Create: `packages/hoshi-sdk/src/payments/core/credential.ts`
- Create: `packages/hoshi-sdk/src/payments/core/receipt.ts`
- Create: `packages/hoshi-sdk/src/payments/core/session.ts`
- Create: `packages/hoshi-sdk/src/payments/core/solana-method.ts`
- Modify: `packages/hoshi-sdk/src/payments/x402.ts`
- Modify: `packages/hoshi-sdk/src/payments/mpp.ts`
- Modify: `packages/hoshi-sdk/src/hoshi.ts`
- Test: `packages/hoshi-sdk/test/payments-core.test.ts`
- Test: `packages/hoshi-sdk/test/payments.test.ts`

- [ ] **Step 1: Extend the failing tests for charge and session flows**

```ts
it('creates and verifies a solana charge credential', async () => {
  const challenge = createPaymentChallenge({
    protocol: 'mpp',
    intent: 'charge',
    method: 'solana',
    resource: 'POST /tool',
    amount: { amount: '1', asset: 'USDC' },
    recipient: 'TreasuryPubkey',
    requestHash: 'hash-1',
  })
  const credential = createPaymentCredential(challenge, { txSignature: 'sig-1' })
  expect(credential.challengeId).toBe(challenge.challengeId)
  expect(credential.protocol).toBe('mpp')
})

it('creates a session and tops it up', async () => {
  const session = createPaymentSession({
    method: 'solana',
    recipient: 'TreasuryPubkey',
    funding: { amount: '10', asset: 'USDC' },
    requestHash: 'session-hash',
  })
  const topped = topUpPaymentSession(session, { amount: '5', asset: 'USDC' })
  expect(topped.remaining.amount).toBe('15')
})
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `pnpm --filter @hoshi/sdk test -- test/payments-core.test.ts test/payments.test.ts`
Expected: FAIL because protocol helpers and session logic are missing.

- [ ] **Step 3: Implement Solana-first protocol helpers**

```ts
export function createPaymentChallenge(input: CreatePaymentChallengeInput): PaymentChallenge { /* uuid, expiresAt, normalized shape */ }
export function createPaymentCredential(challenge: PaymentChallenge, payload: Record<string, unknown>): PaymentCredential { /* bind challengeId + requestHash */ }
export function verifyPaymentCredential(challenge: PaymentChallenge, credential: PaymentCredential): PaymentVerificationResult { /* expired, mismatch, ok */ }
export function createPaymentReceipt(challenge: PaymentChallenge, reference: string): PaymentReceipt { /* receipt metadata */ }
export function createPaymentSession(input: CreatePaymentSessionInput): SessionIntent { /* funding, remaining, expiresAt */ }
export function topUpPaymentSession(session: SessionIntent, amount: PaymentAmount): SessionIntent { /* add remaining, extend expiry */ }
export function closePaymentSession(session: SessionIntent): SessionIntent { /* closed state */ }
```

- [ ] **Step 4: Wire x402 and MPP helpers onto the shared core**

```ts
export function toX402PaymentRequirement(record: Invoice): X402PaymentRequirement {
  return {
    kind: 'x402',
    challenge: createPaymentChallenge({ protocol: 'x402', intent: 'charge', method: 'solana', /* ... */ }),
    record,
  }
}

export function toMppPaymentIntent(record: PaymentLink): MppPaymentIntent {
  return {
    kind: 'mpp',
    charge: createChargeIntent({ /* ... */ }),
    record,
  }
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @hoshi/sdk test -- test/payments-core.test.ts test/payments.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/hoshi-sdk/src/payments/core/challenge.ts packages/hoshi-sdk/src/payments/core/credential.ts packages/hoshi-sdk/src/payments/core/receipt.ts packages/hoshi-sdk/src/payments/core/session.ts packages/hoshi-sdk/src/payments/core/solana-method.ts packages/hoshi-sdk/src/payments/x402.ts packages/hoshi-sdk/src/payments/mpp.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/test/payments-core.test.ts packages/hoshi-sdk/test/payments.test.ts
git commit -m "feat: wire solana payment flows into shared core"
```

### Task 3: Add MCP payment orchestration on the shared core

**Files:**
- Modify: `packages/hoshi-mcp/src/app.ts`
- Modify: `packages/hoshi-mcp/src/handlers/payments.ts`
- Modify: `packages/hoshi-mcp/src/handlers/financial.ts`
- Modify: `packages/hoshi-mcp/src/core/server.ts`
- Modify: `packages/hoshi-mcp/src/core/protocol.ts`
- Test: `packages/hoshi-mcp/test/mcp.test.ts`
- Test: `packages/hoshi-mcp/test/startup.test.ts`

- [ ] **Step 1: Write the failing MCP payment test**

```ts
import { describe, expect, it } from 'vitest'
import { createHoshiMcpServer } from '../src/app.js'

describe('MCP payment orchestration', () => {
  it('exposes challenge, credential, receipt, and session tools', async () => {
    const app = await createHoshiMcpServer({ env: { HOSHI_TRANSPORT: 'stdio' } })
    const toolNames = app.listTools().map((tool) => tool.name)
    expect(toolNames).toEqual(expect.arrayContaining([
      'hoshi_payment_challenge',
      'hoshi_payment_credential',
      'hoshi_payment_receipt',
      'hoshi_payment_session_create',
    ]))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @hoshi/mcp test -- test/mcp.test.ts`
Expected: FAIL because the payment orchestration tools do not exist yet.

- [ ] **Step 3: Add MCP tools that delegate to the SDK core**

```ts
export function createPaymentTools(context: ServerContext): MCPTool[] {
  return [
    { name: 'hoshi_payment_challenge', handler: async (args) => context.paymentCore.createChallenge(args) },
    { name: 'hoshi_payment_credential', handler: async (args) => context.paymentCore.createCredential(args) },
    { name: 'hoshi_payment_receipt', handler: async (args) => context.paymentCore.createReceipt(args) },
    { name: 'hoshi_payment_session_create', handler: async (args) => context.paymentCore.createSession(args) },
    { name: 'hoshi_payment_session_topup', handler: async (args) => context.paymentCore.topUpSession(args) },
    { name: 'hoshi_payment_session_close', handler: async (args) => context.paymentCore.closeSession(args) },
  ]
}
```

- [ ] **Step 4: Wire the server context to instantiate the shared payment core once**

```ts
context.paymentCore = createSharedPaymentCore({
  sdk: context.sdk,
  method: 'solana',
})
```

- [ ] **Step 5: Run MCP tests and typecheck**

Run: `pnpm --filter @hoshi/mcp test && pnpm --filter @hoshi/mcp typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/hoshi-mcp/src/app.ts packages/hoshi-mcp/src/handlers/payments.ts packages/hoshi-mcp/src/handlers/financial.ts packages/hoshi-mcp/src/core/server.ts packages/hoshi-mcp/src/core/protocol.ts packages/hoshi-mcp/test/mcp.test.ts packages/hoshi-mcp/test/startup.test.ts
git commit -m "feat: add mcp payment orchestration on shared core"
```

### Task 4: Final verification and cleanup

**Files:**
- Modify as needed from earlier tasks
- Test: `packages/hoshi-sdk/test/*.test.ts`
- Test: `packages/hoshi-mcp/test/*.test.ts`

- [ ] **Step 1: Run the full SDK + MCP test suites**

Run: `pnpm --filter @hoshi/sdk test && pnpm --filter @hoshi/sdk typecheck && pnpm --filter @hoshi/mcp test && pnpm --filter @hoshi/mcp typecheck`
Expected: PASS.

- [ ] **Step 2: Build both packages**

Run: `pnpm --filter @hoshi/sdk build && pnpm --filter @hoshi/mcp build`
Expected: PASS.

- [ ] **Step 3: Review exports and docs**

Ensure `packages/hoshi-sdk/src/index.ts` exports the new payment core surface and `packages/hoshi-mcp/src/index.ts` re-exports the new MCP payment tooling.

- [ ] **Step 4: Commit any final cleanup**

```bash
git add .
git commit -m "feat: complete shared payment core for sdk and mcp"
```
