# Hoshi SDK Core Bank Account Spec

## 1) Problem Statement

Hoshi needs a complete TypeScript SDK for AI agent bank accounts on Solana.

The current product direction is clear, but the SDK layer still needs a well-defined core that can stand on its own before broader rails and workflow expansion arrive. Agent app builders need one stable surface for wallet lifecycle, balance visibility, sending and receiving value, receipts, transaction history, contacts, and safety controls. They should not have to assemble those pieces from separate adapters or infer product behavior from low-level Solana primitives.

t2000 is the reference for scope and shape: a single-class bank-account SDK with clean UX, safe send/receive flows, history, and safeguards. Hoshi should mirror that product clarity while staying Solana-native.

The immediate problem is not “how do we add every possible financial feature.” The problem is defining the core bank-account SDK that can be shipped, trusted, and extended later without turning into a broad crypto platform.

## 2) Solution

Build a single-class, TypeScript-first SDK facade for AI agent bank accounts on Solana.

The SDK should present a simple mental model: create or load a wallet, inspect balances, send and receive value, manage payment links and invoices, review history, maintain contacts, and apply safeguards before funds move. Under that facade, the implementation should be separated into explicit boundaries for storage, signer management, chain access, policy evaluation, and payment normalization.

Core capabilities in scope now:
- Single-class facade for the main developer experience.
- Wallet lifecycle: create, load, unlock, lock, import, export.
- Balance and account summary views.
- Send money.
- Receive money.
- Invoices and payment links.
- Transaction history and receipts.
- Contacts.
- Safeguards, approvals, and policy checks.
- Storage boundaries and signer/chain adapter boundaries.
- Payment protocol normalization only where needed for receive/get-paid flows, including x402 and MPP metadata/wrappers.

The SDK should feel like a bank account API for agents, not like a generic wallet toolkit or a DeFi router. It should make the safe path obvious and the unsafe path explicit.

## 3) User Stories

1. As an AI agent app developer, I want one primary SDK object that exposes the core bank-account actions so I can integrate quickly without learning a multi-package architecture.
2. As an AI agent app developer, I want to create a new Solana-backed wallet for an agent so the agent can start with a usable account immediately.
3. As an AI agent app developer, I want to load an existing wallet so I can restore an agent account across sessions or devices.
4. As an AI agent app developer, I want to unlock a wallet only when needed so the secret material stays protected while the app is idle.
5. As an AI agent app developer, I want to lock a wallet again after use so the SDK supports a safer operational posture.
6. As an AI agent app developer, I want to import an existing wallet from supported secret material so I can migrate users or agent accounts into Hoshi.
7. As an AI agent app developer, I want to export wallet material in a controlled way so backup and migration workflows are possible.
8. As an AI agent app developer, I want to read the account balance and asset summary so I can show the agent’s available funds and holdings.
9. As an AI agent app developer, I want a clear account summary that includes spendable balance, token balances, and wallet status so I can present a concise operational dashboard.
10. As an AI agent app developer, I want to send funds from one agent account to another address so the agent can pay for goods, services, or coordination steps.
11. As an AI agent app developer, I want send flows to support safeguards before submission so the product can stop unsafe transfers.
12. As an AI agent app developer, I want to preview or stage a send before it is committed so I can build approval and confirmation experiences.
13. As an AI agent app developer, I want receipts for sends so I can show users proof of payment and support later reconciliation.
14. As an AI agent app developer, I want to receive payments into the agent account so the agent can get paid for work, usage, or services.
15. As an AI agent app developer, I want to create invoices so I can request payment for an amount, recipient context, and purpose.
16. As an AI agent app developer, I want to create payment links so a human or another agent can pay without needing a custom checkout flow.
17. As an AI agent app developer, I want receive flows to normalize x402 and MPP-style payment metadata where relevant so I can interoperate with common agent payment patterns.
18. As an AI agent app developer, I want transaction history so I can inspect prior sends, receives, and linked invoice activity.
19. As an AI agent app developer, I want transaction receipts so I can correlate blockchain activity with app-level intent.
20. As an AI agent app developer, I want to attach contacts to addresses and labels so the agent can pay known recipients without re-entering raw addresses.
21. As an AI agent app developer, I want contact metadata to be persistent so recurring recipients remain available across sessions.
22. As an AI agent app developer, I want policy checks before payments are executed so I can enforce max amounts, allowlists, and approval rules.
23. As an AI agent app developer, I want approval escalation when a policy is not satisfied so a human or supervising system can intervene.
24. As an AI agent app developer, I want explicit policy outcomes so I know whether an action was allowed, blocked, or escalated.
25. As an AI agent app developer, I want the SDK to separate storage from chain access so I can swap persistence strategies without rewriting payment logic.
26. As an AI agent app developer, I want the SDK to separate signer management from chain access so I can support different custody models.
27. As an AI agent app developer, I want the SDK to separate chain interaction from business logic so I can test against mocks or alternate Solana backends.
28. As a human operator, I want a predictable wallet lifecycle so I can understand when funds are accessible and when they are locked.
29. As a human operator, I want clear receipts and history so I can audit what the agent did with money.
30. As a human operator, I want safeguards that are easy to understand so I can trust the agent account without reading implementation details.
31. As a human operator, I want the SDK to stay focused on bank-account behavior so I do not confuse it with trading, yield, or cross-chain products.
32. As a human operator, I want receive and invoice flows to feel like getting paid, not like manually assembling protocol payloads.
33. As a human operator, I want the SDK to behave consistently across agent apps so the same core concepts work everywhere.
34. As an AI agent builder, I want stable data shapes for balances, transactions, receipts, contacts, invoices, and approval results so downstream UI and automation can rely on them.
35. As an AI agent builder, I want human-readable errors and machine-readable error codes so I can recover, retry, or escalate appropriately.
36. As an AI agent builder, I want the SDK to support a narrow, reliable first release so I can ship value before broader financial features exist.

## 4) Implementation Decisions

- The SDK will be centered on a single public facade object that owns the main bank-account experience.
- The facade will coordinate smaller internal modules rather than exposing those modules as the primary user surface.
- The internal modules should be conceptually split into wallet management, balance/account summary, send/transfer, receive/invoice/payment-link, history/receipts, contacts, safeguards/policy, storage, signer, and chain access.
- Wallet lifecycle will be a first-class concern, with explicit states for created, loaded, unlocked, and locked.
- Import and export will be treated as controlled wallet-material operations, not casual helper functions.
- Balance reads will return a summary-oriented model, not just raw chain responses.
- Account summary will be a composite view that can combine spendable balance, token holdings, wallet state, and recent activity signals.
- Send money will go through a policy step before submission.
- Receive money will support invoice and payment-link generation as the main developer-facing primitives.
- Transaction history will be modeled as an app-level record stream with receipt linkage, not just chain transaction logs.
- Contacts will be an SDK-managed abstraction for recipient identity, aliasing, and repeat payments.
- Safeguards will include policy evaluation and approval escalation, with explicit outcomes that the caller can inspect.
- The storage boundary will own persistence of wallet state, contacts, receipts, and policy-related local metadata.
- The signer boundary will own access to signing material and unlocking behavior without embedding chain logic.
- The chain boundary will own Solana-specific reads, transaction construction, submission, and receipt resolution.
- The SDK will distinguish between storage, signer, and chain concerns through separate interfaces so implementations can vary independently.
- Chain interaction will be adapter-based so Solana RPC and transaction submission can evolve without changing the facade contract.
- Payment normalization for x402 and MPP will exist only to support receive/get-paid flows and related metadata handling.
- The SDK will not become a full payment gateway, protocol router, or settlement platform in this phase.
- Error handling will be explicit and structured so callers can tell the difference between validation failures, policy blocks, adapter failures, and chain failures.
- The public API should prioritize readable intent over low-level primitives.

## 5) Testing Decisions

- Test the SDK through external behavior, not internal implementation details.
- Verify that a caller can create, load, unlock, lock, import, and export a wallet through the public facade.
- Verify that balance and summary reads return consistent, user-facing account information.
- Verify that send flows are blocked when policy conditions fail and allowed when conditions pass.
- Verify that send flows produce receipts and history entries that can be retrieved later.
- Verify that receive flows can create invoices and payment links with the expected metadata.
- Verify that payment normalization supports the receive/get-paid experience without requiring callers to understand protocol internals.
- Verify that contacts persist and are usable as payment targets.
- Verify that approvals are requested when policy rules require escalation.
- Verify that storage, signer, and chain adapters can be swapped without changing observable SDK behavior.
- Verify that lock state meaningfully prevents sensitive wallet actions until unlocked again.
- Verify that errors are stable enough for app developers to handle programmatically.
- Verify that the SDK works against mocked adapters and against a live Solana integration path where feasible.
- Verify that receipts and history remain internally consistent after sends and receives.
- Verify that the SDK never requires DeFi, swap, yield, or cross-chain dependencies to pass core bank-account tests.

## 6) Out of Scope

- DeFi rails of any kind.
- Yield, staking, lending, borrowing, vaults, or strategy routing.
- Swap execution or swap quoting.
- Cross-chain movement or bridging.
- Liquidity management.
- Portfolio management.
- Trading features.
- A full payment gateway product.
- A general-purpose agent orchestration engine.
- A broad MCP surface for non-bank-account behavior.
- Advanced commerce workflows such as negotiation, escrow, dispute resolution, or shopping.
- Application-layer routing across multiple financial protocols beyond the receive/get-paid normalization needed for x402 and MPP metadata.

## 7) Further Notes

- This spec defines the bank-account core only; later phases can expand into adjacent surfaces after the facade, storage model, and safety model stabilize.
- The product should keep Solana-native assumptions visible in the API and documentation so the SDK feels purpose-built rather than chain-agnostic.
- The long-term architecture can grow deeper, but the first release should remain narrow enough to understand in one reading.
- If a future feature does not help an agent create, hold, send, receive, explain, or protect money, it does not belong in this layer.
- The best success criterion for this phase is that a developer can treat Hoshi like a trustworthy bank-account SDK for AI agents and never need to reach for DeFi plumbing to do the basics.
