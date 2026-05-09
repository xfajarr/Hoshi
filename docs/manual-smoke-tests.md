# Manual smoke tests

This runbook covers the **completed, user-facing surfaces** that can be checked by hand right now.

## In scope

- `@hoshi/sdk`: wallets, contacts, safeguards, invoices, payment primitives, KYA client/namespace, summaries, and read-only chain helpers.
- `@hoshi/engine`: policy evaluation and approval/rejection flow.
- `@hoshi/gateway`: health, service catalog, stats, and x402 payment gating.
- `@hoshi/mcp`: server startup, tool registration, and payment tool surface.
- `@hoshi/cli`: wallet creation, local persistence, and policy guardrails.

## Out of scope

- Anything marked partial in the gap docs.
- Real settlement / production payment rails.
- Long-running runtime orchestration.
- Consumer app flows that are not in this repo.

## Preflight

```bash
pnpm install
pnpm build
pnpm test
```

Use a devnet wallet and private RPC if you want live-chain validation.

---

## 1) SDK smoke tests

### A. Wallet + contacts + receipts

Open a Node REPL or a tiny TS script and run:

```ts
import { Hoshi, InMemoryStorageAdapter } from '@hoshi/sdk'

const hoshi = new Hoshi({ storage: new InMemoryStorageAdapter() })

const { walletId, publicKey } = await hoshi.createWallet({
  pin: '1234',
  label: 'Smoke Test',
  cluster: 'devnet',
})

hoshi.addContact('treasury', publicKey)
const contact = hoshi.getContact('treasury')
```

Expected:
- wallet id + public key returned
- contact resolves to the same address
- no uncaught error

### B. Payment primitives

```ts
const challenge = hoshi.createPaymentChallenge({
  protocol: 'x402',
  intent: 'charge',
  method: 'solana',
  resource: 'GET /premium',
  amount: { amount: '1', asset: 'USDC' },
  recipient: 'wallet-1',
  requestHash: 'req-1',
  expiresInSeconds: 60,
})

const credential = hoshi.createPaymentCredential(challenge, { txSignature: 'sig-1' })
const verification = hoshi.verifyPaymentCredential(credential)
const receipt = hoshi.createPaymentReceipt(credential, 'req-1')
```

Expected:
- `verification.ok === true`
- receipt links back to the challenge
- credential/receipt share the same request hash

### C. MPP session flow

```ts
const session = hoshi.createSession({
  protocol: 'mpp',
  method: 'solana',
  recipient: 'wallet-2',
  funding: { amount: '2', asset: 'SOL' },
  requestHash: 'session-1',
  expiresInSeconds: 120,
})

const toppedUp = hoshi.topUpSession(session, { amount: '0.5', asset: 'SOL' })
const closed = hoshi.closeSession(toppedUp)
```

Expected:
- session starts as `active`
- remaining balance increases after top-up
- session can be closed cleanly

### D. KYA client

If the KYA program is deployed for your environment, validate:

```ts
const profile = await hoshi.kya.claimHandle({
  handle: 'alice.hoshi',
  displayName: 'Alice',
  metadataUri: null,
})

const resolved = await hoshi.kya.resolveHandle('alice.hoshi')
```

Expected:
- client initializes without throwing
- handle can be claimed with a funded wallet
- `resolveHandle` returns the same profile

---

## 2) Engine smoke tests

Run the package-level tests first, then spot-check the policy flow manually.

```bash
pnpm --filter @hoshi/engine test
```

Manual check:
- create a policy rule that blocks or escalates a large transfer
- evaluate `transfer.send` with an amount above the threshold
- confirm the action becomes `write_escalated` or blocked
- approve and reject the pending action once

Expected:
- safe reads pass without rules
- large transfers require approval
- approval and rejection persist

---

## 3) Gateway smoke tests

Start the gateway:

```bash
pnpm --filter @hoshi/gateway build
node packages/hoshi-gateway/dist/server.js
```

Then in another terminal:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/services
curl http://localhost:3000/stats
```

Expected:
- `/health` returns `{ "status": "ok" }`
- `/services` lists the sample services
- `/stats` starts at zero requests / zero revenue

### x402 gate

No proof:

```bash
curl -i -X POST http://localhost:3000/proxy/openai/v1/chat/completions
```

Expected:
- `402 Payment Required`
- `X-Payment-Required` header present
- JSON body includes `scheme: x402`, `network: solana`, `token: USDC`, `amount: 10000`

Matching proof:

```bash
curl -i -X POST http://localhost:3000/proxy/openai/v1/chat/completions   -H 'X-Payment: {"txSignature":"sig-1","sender":"sender-1","recipient":"HOSHI_TREASURY","amount":"10000","token":"USDC","timestamp":"2026-01-01T00:00:00.000Z"}'
```

Expected:
- `200 OK`
- response body `{ "ok": true }`
- `/stats` increments total requests and revenue

---

## 4) MCP smoke tests

Build and start the server:

```bash
pnpm --filter @hoshi/mcp build
pnpm --filter @hoshi/mcp exec hoshi-mcp
```

Expected:
- process starts without crashing
- tool registration completes
- no startup errors in stderr

If your MCP client can inspect tools, verify the core surface includes:
- `hoshi_balance`
- `hoshi_send`
- `hoshi_create_invoice`
- `hoshi_create_payment_link`
- `hoshi_swap_quote`
- `hoshi_deposit_yield`
- `hoshi_history`

Also confirm the new payment core tools are exposed through the server context.

---

## 5) CLI smoke tests

Build and inspect help:

```bash
pnpm --filter @hoshi/cli build
pnpm exec hoshi --help
```

Then try the wallet flow:

```bash
export HOSHI_WALLET_PASSWORD='your-password'
pnpm exec hoshi create --label 'Smoke Test' --airdrop-devnet 0.1 --json
```

Expected:
- wallet is created
- local state is written under `~/.hoshi/`
- default guardrails are installed

Optional checks:
- `pnpm exec hoshi address`
- `pnpm exec hoshi history`
- `pnpm exec hoshi contacts`

Expected:
- commands read local state without corruption
- JSON mode prints structured output when `--json` is used

---

## Pass / fail rule

A manual smoke test passes only if:
- the command starts cleanly,
- the expected response shape appears,
- and no state is corrupted afterward.

If you need deeper coverage, prefer the package test suites next:

```bash
pnpm --filter @hoshi/sdk test
pnpm --filter @hoshi/engine test
pnpm --filter @hoshi/gateway test
pnpm --filter @hoshi/mcp test
pnpm --filter @hoshi/cli test
```
