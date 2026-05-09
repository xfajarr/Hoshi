# Hoshi SDK Core Bank-Account v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the bank-account core slice of `@hoshi/sdk` with one stable facade for account summary, send, receive, history, contacts, safeguards, and typed errors.

**Architecture:** Build on the current `Hoshi` class, `payments/*`, `contacts.ts`, `safeguards/*`, and `wallet/classify.ts` modules already in place. Keep the public surface bank-account-first and Solana-native, normalize every money-moving response into stable value objects, and keep DeFi, swap, yield, and cross-chain explicitly out of this plan.

**Tech Stack:** TypeScript, pnpm workspaces, Vitest, tsup, zod, `@solana/web3.js`, existing `@hoshi/sdk` modules.

---

## File Structure

### Existing files to modify

- Modify: `packages/hoshi-sdk/src/hoshi.ts`
  Purpose: add the canonical bank-account facade methods and keep legacy aliases thin.
- Modify: `packages/hoshi-sdk/src/core/types.ts`
  Purpose: add the normalized account-summary, history, approval, and receipt-facing domain types.
- Modify: `packages/hoshi-sdk/src/core/result.ts`
  Purpose: keep result helpers and `HoshiError` shape consistent across the new bank-account surface.
- Modify: `packages/hoshi-sdk/src/errors.ts`
  Purpose: add stable error codes for account summary, payment, history, approval, and facade failures.
- Modify: `packages/hoshi-sdk/src/services/wallet.ts`
  Purpose: return normalized account summaries and balance data without leaking transport details.
- Modify: `packages/hoshi-sdk/src/services/transfer.ts`
  Purpose: normalize the send flow, preflight checks, and receipt output.
- Modify: `packages/hoshi-sdk/src/services/invoice.ts`
  Purpose: normalize receive, invoice, and payment-link records on one shared shape.
- Modify: `packages/hoshi-sdk/src/contacts.ts`
  Purpose: make contact resolution stable for send, receive, and history views.
- Modify: `packages/hoshi-sdk/src/safeguards/types.ts`
  Purpose: define explicit approval outcome types and policy metadata.
- Modify: `packages/hoshi-sdk/src/safeguards/enforcer.ts`
  Purpose: return explicit approval outcomes instead of only throwing on policy failures.
- Modify: `packages/hoshi-sdk/src/safeguards/errors.ts`
  Purpose: keep safeguard errors machine-readable and aligned with the new approval outcomes.
- Modify: `packages/hoshi-sdk/src/wallet/classify.ts`
  Purpose: normalize wallet/account summaries and receipt/history classification helpers.
- Modify: `packages/hoshi-sdk/src/index.ts`
  Purpose: re-export the canonical bank-account API from one stable package root.
- Modify: `packages/hoshi-sdk/test/core.test.ts`
  Purpose: lock result/error consistency.
- Modify: `packages/hoshi-sdk/test/hoshi-wallet.test.ts`
  Purpose: keep wallet lifecycle behavior aligned with the new facade.
- Modify: `packages/hoshi-sdk/test/payments.test.ts`
  Purpose: lock receive/payment-link wrappers and canonical payment shapes.
- Modify: `packages/hoshi-sdk/test/integration.test.ts`
  Purpose: keep end-to-end SDK behavior aligned with the normalized bank-account API.

### New files to create

- Create: `packages/hoshi-sdk/test/account-summary.test.ts`
  Purpose: focused contract tests for balance/account summary cleanup.
- Create: `packages/hoshi-sdk/test/send.test.ts`
  Purpose: focused contract tests for send normalization and receipt output.
- Create: `packages/hoshi-sdk/test/history-contacts.test.ts`
  Purpose: focused contract tests for history, receipts, and contacts consistency.
- Create: `packages/hoshi-sdk/test/safeguards.test.ts`
  Purpose: focused contract tests for allowed, blocked, and escalated approval outcomes.
- Create: `packages/hoshi-sdk/test/bank-account-api.test.ts`
  Purpose: public surface test that the canonical facade methods and exports stay stable.
- Create: `packages/hoshi-sdk/README.md`
  Purpose: document the canonical bank-account API and the expected method names.

### Verification commands

- `pnpm --filter @hoshi/sdk test`
- `pnpm --filter @hoshi/sdk typecheck`
- `pnpm --filter @hoshi/sdk build`
- Targeted examples used in the slices below:
  - `pnpm --filter @hoshi/sdk test -- test/account-summary.test.ts test/hoshi-wallet.test.ts`
  - `pnpm --filter @hoshi/sdk test -- test/send.test.ts test/payments.test.ts`
  - `pnpm --filter @hoshi/sdk test -- test/history-contacts.test.ts test/integration.test.ts`
  - `pnpm --filter @hoshi/sdk test -- test/safeguards.test.ts test/core.test.ts`

## Phase 1: Balance / Account Summary Cleanup

### Task 1: Normalize account summary and balance reads

Files:
Create: `packages/hoshi-sdk/test/account-summary.test.ts`
Modify: `packages/hoshi-sdk/src/core/types.ts`
Modify: `packages/hoshi-sdk/src/wallet/classify.ts`
Modify: `packages/hoshi-sdk/src/services/wallet.ts`
Modify: `packages/hoshi-sdk/src/hoshi.ts`
Modify: `packages/hoshi-sdk/test/hoshi-wallet.test.ts`

1. Write the failing test.

```ts
import { describe, expect, it } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('account summary', () => {
  it('returns wallet, balances, spendable balance, and status in one object', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const created = await sdk.createWallet({ password: 'secret123', label: 'Agent Treasury' })

    const summary = await sdk.getAccountSummary(created.walletId)

    expect(summary.wallet.id).toBe(created.walletId)
    expect(summary.wallet.publicKey).toBe(created.publicKey)
    expect(summary.status).toBe('ready')
    expect(Array.isArray(summary.balances)).toBe(true)
    expect(summary.spendableBalance?.asset).toBeDefined()
  })
})
```

2. Run the targeted test to confirm the new summary contract fails.

Run: `pnpm --filter @hoshi/sdk test -- test/account-summary.test.ts test/hoshi-wallet.test.ts`

Expected: fail because `Hoshi` does not yet expose a normalized `getAccountSummary()` facade and the summary types are still too thin.

3. Implement the minimal summary path.

```ts
export interface AccountSummary {
  wallet: WalletSummary
  balances: BalanceSummary[]
  spendableBalance: BalanceSummary | null
  status: 'ready' | 'locked' | 'missing'
  canSend: boolean
}

async getAccountSummary(walletId?: string): Promise<AccountSummary> {
  return this._walletService.getAccountSummary(walletId ?? this._wallet?.id)
}
```

4. Verify the slice.

Run: `pnpm --filter @hoshi/sdk test -- test/account-summary.test.ts test/hoshi-wallet.test.ts`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk typecheck`

Expected: PASS.

5. Commit the slice.

```bash
git add packages/hoshi-sdk/src/core/types.ts packages/hoshi-sdk/src/wallet/classify.ts packages/hoshi-sdk/src/services/wallet.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/test/account-summary.test.ts packages/hoshi-sdk/test/hoshi-wallet.test.ts
git commit -m "feat: normalize sdk account summary"
```

## Phase 2: Send Money and Receipt Normalization

### Task 2: Make send the canonical outbound payment path

Files:
Create: `packages/hoshi-sdk/test/send.test.ts`
Modify: `packages/hoshi-sdk/src/core/types.ts`
Modify: `packages/hoshi-sdk/src/wallet/classify.ts`
Modify: `packages/hoshi-sdk/src/services/transfer.ts`
Modify: `packages/hoshi-sdk/src/hoshi.ts`
Modify: `packages/hoshi-sdk/test/payments.test.ts`

1. Write the failing test.

```ts
import { describe, expect, it } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('send flow', () => {
  it('returns a normalized send receipt and stores it in history', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const sender = await sdk.createWallet({ password: 'secret123', label: 'Sender' })
    const recipient = await sdk.createWallet({ password: 'secret123', label: 'Recipient' })

    const receipt = await sdk.send({
      walletId: sender.walletId,
      to: recipient.publicKey,
      amount: '1.5',
      asset: 'SOL',
    })

    expect(receipt.actionType).toBe('transfer.send')
    expect(receipt.status).toBe('success')
    expect(receipt.metadata?.counterpartyAddress).toBe(recipient.publicKey)
    expect(receipt.metadata?.flow).toBe('send')
  })
})
```

2. Run the targeted test to confirm the new send contract fails.

Run: `pnpm --filter @hoshi/sdk test -- test/send.test.ts test/payments.test.ts`

Expected: fail because `send()` is not yet the canonical facade method and receipts are not normalized enough for history.

3. Implement the minimal send path.

```ts
async send(input: { walletId?: string; to: string; amount: string; asset: 'SOL' | 'USDC' }): Promise<Receipt> {
  const walletId = input.walletId ?? this._wallet?.id
  if (!walletId) throw new HoshiError('ACCOUNT_NOT_LOADED', 'No wallet loaded')

  const resolved = this._contacts.resolve(input.to)
  const result = await this._transferService.sendSigned(
    { walletId, to: resolved.address, amount: { amount: input.amount, asset: input.asset } },
    this._signer,
  )

  if (!result.ok) throw new HoshiError('TRANSACTION_FAILED', result.error.message)
  return result.value
}
```

4. Verify the slice.

Run: `pnpm --filter @hoshi/sdk test -- test/send.test.ts test/payments.test.ts`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk build`

Expected: PASS.

5. Commit the slice.

```bash
git add packages/hoshi-sdk/src/core/types.ts packages/hoshi-sdk/src/wallet/classify.ts packages/hoshi-sdk/src/services/transfer.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/test/send.test.ts packages/hoshi-sdk/test/payments.test.ts
git commit -m "feat: normalize sdk send receipts"
```

## Phase 3: Receive Money, Invoices, and Payment Links

### Task 3: Normalize receive and payment-link wrappers

Files:
Modify: `packages/hoshi-sdk/src/core/types.ts`
Modify: `packages/hoshi-sdk/src/payments/types.ts`
Modify: `packages/hoshi-sdk/src/payments/x402.ts`
Modify: `packages/hoshi-sdk/src/payments/mpp.ts`
Modify: `packages/hoshi-sdk/src/services/invoice.ts`
Modify: `packages/hoshi-sdk/src/hoshi.ts`
Modify: `packages/hoshi-sdk/test/payments.test.ts`

1. Write the failing test.

```ts
import { describe, expect, it } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('receive and payment links', () => {
  it('returns a normalized invoice wrapper for receive', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const wallet = await sdk.createWallet({ password: 'secret123', label: 'Receiver' })

    const wrapper = await sdk.receive({
      walletId: wallet.walletId,
      amount: '7.25',
      asset: 'USDC',
      description: 'Agent completion reward',
    })

    expect(wrapper.kind).toBe('x402')
    expect(wrapper.protocols).toEqual(['x402', 'mpp'])
    expect(wrapper.record.status).toBe('pending')
    expect(wrapper.record.paymentLink).toContain('https://pay.hoshi.ai/i/')
  })

  it('returns a normalized payment-link wrapper for createPaymentLink', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const wallet = await sdk.createWallet({ password: 'secret123', label: 'Seller' })

    const wrapper = await sdk.createPaymentLink({
      walletId: wallet.walletId,
      amount: '12.50',
      asset: 'USDC',
      description: 'Subscription link',
    })

    expect(wrapper.kind).toBe('mpp')
    expect(wrapper.protocols).toEqual(['x402', 'mpp'])
    expect(wrapper.record.url).toContain('https://pay.hoshi.ai/p/')
  })
})
```

2. Run the targeted test to confirm the receive/link contract fails.

Run: `pnpm --filter @hoshi/sdk test -- test/payments.test.ts`

Expected: fail because the receive/link normalization is not fully aligned with the shared wrapper contract yet.

3. Implement the shared normalization path.

```ts
export function toX402PaymentRequirement(invoice: Invoice): X402PaymentRequirement {
  return {
    kind: 'x402',
    protocols: PAYMENT_PROTOCOLS,
    id: invoice.id,
    walletId: invoice.walletId,
    amount: invoice.amount,
    description: invoice.description,
    record: invoice,
  }
}
```

4. Verify the slice.

Run: `pnpm --filter @hoshi/sdk test -- test/payments.test.ts`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk typecheck`

Expected: PASS.

5. Commit the slice.

```bash
git add packages/hoshi-sdk/src/core/types.ts packages/hoshi-sdk/src/payments/types.ts packages/hoshi-sdk/src/payments/x402.ts packages/hoshi-sdk/src/payments/mpp.ts packages/hoshi-sdk/src/services/invoice.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/test/payments.test.ts
git commit -m "feat: normalize sdk receive wrappers"
```

## Phase 4: History, Receipts, and Contacts Consistency

### Task 4: Make history a normalized view over receipts and contacts

Files:
Create: `packages/hoshi-sdk/test/history-contacts.test.ts`
Modify: `packages/hoshi-sdk/src/core/types.ts`
Modify: `packages/hoshi-sdk/src/wallet/classify.ts`
Modify: `packages/hoshi-sdk/src/contacts.ts`
Modify: `packages/hoshi-sdk/src/hoshi.ts`
Modify: `packages/hoshi-sdk/test/integration.test.ts`

1. Write the failing test.

```ts
import { describe, expect, it } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('history and contacts', () => {
  it('returns newest-first history entries with resolved contact metadata', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter() })
    const sender = await sdk.createWallet({ password: 'secret123', label: 'Sender' })
    const recipient = await sdk.createWallet({ password: 'secret123', label: 'Recipient' })

    await sdk.contacts.add('ops', recipient.publicKey, 'Operations')
    await sdk.send({ walletId: sender.walletId, to: 'ops', amount: '1', asset: 'SOL' })

    const history = await sdk.getHistory(sender.walletId)

    expect(history[0].direction).toBe('outbound')
    expect(history[0].counterparty?.name).toBe('ops')
    expect(history[0].receipt.actionType).toBe('transfer.send')
  })
})
```

2. Run the targeted test to confirm the history view fails.

Run: `pnpm --filter @hoshi/sdk test -- test/history-contacts.test.ts test/integration.test.ts`

Expected: fail because history is still just raw receipts and the facade does not yet expose a normalized history view.

3. Implement the minimal history view.

```ts
export interface HistoryEntry {
  receipt: Receipt
  direction: 'inbound' | 'outbound' | 'internal'
  counterparty?: { name?: string; address: string }
}

async getHistory(walletId?: string): Promise<HistoryEntry[]> {
  const id = walletId ?? this._wallet?.id
  if (!id) throw new HoshiError('ACCOUNT_NOT_LOADED', 'No wallet ID provided')

  const result = await this._storage.getReceipts(id)
  if (!result.ok) return []
  return result.value.map(receipt => ({ receipt, ...classifyReceipt(receipt) }))
}

listContacts() {
  return this._contacts.list()
}

resolveContact(nameOrAddress: string) {
  return this._contacts.resolve(nameOrAddress)
}
```

4. Verify the slice.

Run: `pnpm --filter @hoshi/sdk test -- test/history-contacts.test.ts test/integration.test.ts`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk build`

Expected: PASS.

5. Commit the slice.

```bash
git add packages/hoshi-sdk/src/core/types.ts packages/hoshi-sdk/src/wallet/classify.ts packages/hoshi-sdk/src/contacts.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/test/history-contacts.test.ts packages/hoshi-sdk/test/integration.test.ts
git commit -m "feat: normalize sdk history and contacts"
```

## Phase 5: Safeguards and Approval Outcomes

### Task 5: Make policy checks return explicit approval outcomes

Files:
Create: `packages/hoshi-sdk/test/safeguards.test.ts`
Modify: `packages/hoshi-sdk/src/core/types.ts`
Modify: `packages/hoshi-sdk/src/safeguards/types.ts`
Modify: `packages/hoshi-sdk/src/safeguards/enforcer.ts`
Modify: `packages/hoshi-sdk/src/safeguards/errors.ts`
Modify: `packages/hoshi-sdk/src/services/transfer.ts`
Modify: `packages/hoshi-sdk/src/hoshi.ts`
Modify: `packages/hoshi-sdk/test/core.test.ts`

1. Write the failing test.

```ts
import { describe, expect, it } from 'vitest'
import { Hoshi, InMemoryStorageAdapter } from '../src/index.js'

describe('safeguards', () => {
  it('returns an escalated approval outcome when a send exceeds maxPerTx', async () => {
    const sdk = new Hoshi({ storage: new InMemoryStorageAdapter(), configDir: '/tmp/hoshi-safeguards' })
    sdk.safeguards.set('maxPerTx', 10)

    const outcome = await sdk.previewSend({ to: '11111111111111111111111111111111', amount: '25', asset: 'USDC' })

    expect(outcome.status).toBe('escalated')
    expect(outcome.rule).toBe('maxPerTx')
  })
})
```

2. Run the targeted test to confirm approval outcomes are still missing.

Run: `pnpm --filter @hoshi/sdk test -- test/safeguards.test.ts test/core.test.ts`

Expected: fail because the safeguards layer still throws instead of returning an explicit approval outcome.

3. Implement the minimal approval result path.

```ts
export interface ApprovalOutcome {
  status: 'allowed' | 'blocked' | 'escalated'
  rule?: 'locked' | 'maxPerTx' | 'maxDailySend'
  reason: string
}

async previewSend(input: { walletId?: string; to: string; amount: string; asset: 'SOL' | 'USDC' }): Promise<ApprovalOutcome> {
  const walletId = input.walletId ?? this._wallet?.id
  if (!walletId) {
    return { status: 'blocked', rule: 'locked', reason: 'No wallet loaded' }
  }

  return this._safeguards.preview({
    operation: 'transfer.send',
    walletId,
    to: input.to,
    amount: Number(input.amount),
    asset: input.asset,
  })
}

preview(metadata: TxMetadata): ApprovalOutcome {
  this.load()

  if (this.config.locked) {
    return { status: 'blocked', rule: 'locked', reason: 'Wallet is locked' }
  }

  if (OUTBOUND_OPS.has(metadata.operation)) {
    const amount = metadata.amount ?? 0

    if (this.config.maxPerTx > 0 && amount > this.config.maxPerTx) {
      return { status: 'escalated', rule: 'maxPerTx', reason: 'Send exceeds maxPerTx' }
    }

    if (this.config.maxDailySend > 0 && this.config.dailyUsed + amount > this.config.maxDailySend) {
      return { status: 'escalated', rule: 'maxDailySend', reason: 'Send exceeds maxDailySend' }
    }
  }

  return { status: 'allowed', reason: 'approved' }
}
```

4. Verify the slice.

Run: `pnpm --filter @hoshi/sdk test -- test/safeguards.test.ts test/core.test.ts`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk typecheck`

Expected: PASS.

5. Commit the slice.

```bash
git add packages/hoshi-sdk/src/core/types.ts packages/hoshi-sdk/src/safeguards/types.ts packages/hoshi-sdk/src/safeguards/enforcer.ts packages/hoshi-sdk/src/safeguards/errors.ts packages/hoshi-sdk/src/services/transfer.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/test/safeguards.test.ts packages/hoshi-sdk/test/core.test.ts
git commit -m "feat: add sdk approval outcomes"
```

## Phase 6: Error Codes, Result Types, and Facade Consistency

### Task 6: Lock the canonical bank-account API and error contract

Files:
Modify: `packages/hoshi-sdk/src/errors.ts`
Modify: `packages/hoshi-sdk/src/core/result.ts`
Modify: `packages/hoshi-sdk/src/core/types.ts`
Modify: `packages/hoshi-sdk/src/hoshi.ts`
Modify: `packages/hoshi-sdk/src/index.ts`
Modify: `packages/hoshi-sdk/test/core.test.ts`
Modify: `packages/hoshi-sdk/test/bank-account-api.test.ts`

1. Write the failing test.

```ts
import { describe, expect, it } from 'vitest'
import { Hoshi } from '../src/index.js'

describe('bank-account facade', () => {
  it('exposes the canonical methods for the core bank-account API', () => {
    const sdk = new Hoshi()

    expect(typeof sdk.getAccountSummary).toBe('function')
    expect(typeof sdk.send).toBe('function')
    expect(typeof sdk.receive).toBe('function')
    expect(typeof sdk.getHistory).toBe('function')
    expect(typeof sdk.listContacts).toBe('function')
    expect(typeof sdk.previewSend).toBe('function')
  })
})
```

2. Run the targeted test to confirm the facade contract is still inconsistent.

Run: `pnpm --filter @hoshi/sdk test -- test/bank-account-api.test.ts test/core.test.ts`

Expected: fail because some canonical method names and error codes still map through old or partial surfaces.

3. Implement the minimal consistency pass.

```ts
export type HoshiErrorCode =
  | 'ACCOUNT_NOT_LOADED'
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_ADDRESS'
  | 'INVALID_AMOUNT'
  | 'WALLET_NOT_FOUND'
  | 'SAFEGUARD_BLOCKED'
  | 'APPROVAL_REQUIRED'
  | 'CONTACT_NOT_FOUND'
  | 'PAYMENT_EXPIRED'
  | 'TRANSACTION_FAILED'
  | 'UNKNOWN'
```

4. Verify the slice.

Run: `pnpm --filter @hoshi/sdk test -- test/bank-account-api.test.ts test/core.test.ts`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk test`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk typecheck`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk build`

Expected: PASS.

5. Commit the slice.

```bash
git add packages/hoshi-sdk/src/errors.ts packages/hoshi-sdk/src/core/result.ts packages/hoshi-sdk/src/core/types.ts packages/hoshi-sdk/src/hoshi.ts packages/hoshi-sdk/src/index.ts packages/hoshi-sdk/test/bank-account-api.test.ts packages/hoshi-sdk/test/core.test.ts
git commit -m "feat: align sdk facade and error codes"
```

## Phase 7: Docs and Test Alignment

### Task 7: Align the package docs with the canonical core API

Files:
Create: `packages/hoshi-sdk/README.md`
Modify: `packages/hoshi-sdk/test/hoshi-wallet.test.ts`
Modify: `packages/hoshi-sdk/test/payments.test.ts`
Modify: `packages/hoshi-sdk/test/integration.test.ts`
Modify: `packages/hoshi-sdk/test/bank-account-api.test.ts`

1. Write the failing docs-alignment test.

```ts
import { describe, expect, it } from 'vitest'
import { Hoshi } from '../src/index.js'

describe('docs alignment', () => {
  it('keeps the README method names aligned with the exported facade', () => {
    const sdk = new Hoshi()

    expect(typeof sdk.getAccountSummary).toBe('function')
    expect(typeof sdk.send).toBe('function')
    expect(typeof sdk.receive).toBe('function')
    expect(typeof sdk.getHistory).toBe('function')
  })
})
```

2. Run the targeted test to confirm the docs/API contract still needs a final pass.

Run: `pnpm --filter @hoshi/sdk test -- test/bank-account-api.test.ts test/hoshi-wallet.test.ts test/payments.test.ts test/integration.test.ts`

Expected: fail if any doc-facing method names or examples still reference the wrong façade shape.

3. Write the package README against the canonical names only.

```md
# @hoshi/sdk

Canonical core bank-account API:

- `createWallet()`
- `loadWallet()`
- `getAccountSummary()`
- `send()`
- `receive()`
- `createPaymentLink()`
- `getHistory()`
- `listContacts()`
- `resolveContact()`
- `previewSend()`
```

4. Verify the docs and test alignment.

Run: `pnpm --filter @hoshi/sdk test`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk typecheck`

Expected: PASS.

Run: `pnpm --filter @hoshi/sdk build`

Expected: PASS.

5. Commit the docs alignment slice.

```bash
git add packages/hoshi-sdk/README.md packages/hoshi-sdk/test/hoshi-wallet.test.ts packages/hoshi-sdk/test/payments.test.ts packages/hoshi-sdk/test/integration.test.ts packages/hoshi-sdk/test/bank-account-api.test.ts
git commit -m "docs: align sdk bank-account api"
```

## Final Note

DeFi, swap, yield, and cross-chain are explicitly deferred from this plan.
