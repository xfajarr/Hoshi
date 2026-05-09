# Hoshi Shared Payment Core Design

## Goal
Build one protocol core for x402 and MPP that powers both the SDK and MCP server.
The first implementation is Solana-first, but the model must support full protocol-complete x402 + MPP behavior, including one-time charge flows and session/pay-as-you-go flows.

## Non-goals
- Multi-chain payment method shipping in v1
- Card, Lightning, Stripe, or Tempo settlement implementation in v1
- Gateway rewrite in this phase
- UI work

## Current state
- SDK already has payment wrappers for x402 and MPP, plus `pay`, `receive`, and `createPaymentLink`.
- KYA is already Anchor-backed.
- MCP already exposes financial tools, but its payment behavior is not protocol-complete.
- Gateway has a basic x402 middleware, but it is not the target of this phase.

## Product decision
Use one shared payment core for both protocols:
- x402 = narrow HTTP 402 profile
- MPP = broader protocol surface with charge and session support
- Solana is the only live payment method in v1

## Core primitives
The shared core should define:
- `PaymentChallenge`
- `PaymentCredential`
- `PaymentReceipt`
- `ChargeIntent`
- `SessionIntent`
- `PaymentMethod`
- `PaymentMethodRegistry`
- `PaymentVerifier`
- `PaymentSettlement`

## Protocol mapping
### x402
- One-time payment only
- HTTP 402 challenge response
- client retries with credential header/body
- server verifies and settles
- returns receipt on success

### MPP
- Supports charge intent and session intent
- Uses the same shared challenge / credential / receipt model
- Adds request binding, expiry, idempotency, and session lifecycle
- Can represent x402-compatible charge flows

## Proposed SDK structure
Create a shared payment module inside `packages/hoshi-sdk`:
- `src/payments/core/*`
- `src/payments/x402.ts`
- `src/payments/mpp.ts`

The new core should own all protocol behavior.
The existing SDK facade should delegate to it.

## Proposed SDK API
Public methods should include:
- `createChallenge()`
- `createCredential()`
- `verifyCredential()`
- `createReceipt()`
- `pay()`
- `receive()`
- `createPaymentLink()`
- `createSession()`
- `topUpSession()`
- `closeSession()`

## MCP integration
MCP should not reimplement protocol logic.
It should call the shared SDK core and expose payment-aware tools for:
- charging tool calls
- returning challenges
- retrying with credentials
- returning receipts
- starting and topping up sessions

## Solana-first method support
V1 supports a single live method:
- Solana payment method

The method must support:
- challenge creation
- credential creation
- credential verification
- receipt generation
- charge intent execution
- session funding and session usage accounting

## Data flow
1. Client requests a protected resource or tool.
2. Server returns a challenge.
3. Client creates a credential.
4. Server verifies the credential through the shared payment core.
5. Server settles or records the payment.
6. Server returns a receipt.
7. For sessions, the client reuses the session until it is topped up or closed.

## Error model
The shared core should normalize errors into machine-readable codes:
- challenge expired
- credential malformed
- credential invalid
- payment already used
- payment method unsupported
- session expired
- session underfunded
- settlement failed

Errors should be reusable in SDK, MCP, and gateway.

## Test strategy
Add tests for:
- x402 challenge/credential/receipt flow
- MPP charge intent flow
- MPP session flow
- Solana method verification
- MCP tool behavior using the shared core
- compatibility between x402 charge flows and MPP charge flows

## Acceptance criteria
- SDK can create and verify protocol-complete x402 and MPP payment objects.
- MPP supports charge and session flows.
- MCP uses the same payment core as the SDK.
- Solana is the only implemented payment method in v1.
- x402 charge flows map cleanly onto MPP charge flows.
