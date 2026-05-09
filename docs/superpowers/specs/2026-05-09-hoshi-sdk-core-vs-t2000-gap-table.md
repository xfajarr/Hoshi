# Hoshi SDK Core vs t2000 Gap Table

t2000 is the reference for the SDK core bank-account layer. Hoshi should stay Solana-native while matching the same core product shape: a single bank-account surface for wallet, balance, send, receive, history, contacts, and safeguards.

| Area | t2000 reference capability | Hoshi current status | Gap | Priority | Next Hoshi action |
| --- | --- | --- | --- | --- | --- |
| single-class facade | One primary SDK object drives the full bank-account flow | Partial | Core behavior exists, but the public surface is not yet a single cohesive facade | High | Define one `Hoshi` facade as the main entrypoint and route all core actions through it |
| wallet create/load/unlock/lock/import/export | Full wallet lifecycle with explicit state control | Partial | Lifecycle states and controlled material handling are not yet fully standardized | High | Implement wallet state machine and expose create, load, unlock, lock, import, and export methods |
| balance / account summary | Returns spendable balance plus account summary data | Partial | Basic reads exist, but summary shape and developer-facing consistency need tightening | High | Add a normalized account summary model with spendable balance, token balances, and wallet status |
| send money | Safe outbound transfer flow with policy checks and receipts | Partial | Send path exists conceptually, but policy gating and result shape are incomplete | High | Build send flow with preflight policy evaluation, submit step, and receipt output |
| receive money | Inbound payment flow for getting paid | Partial | Receive primitives exist in direction, but flow normalization and developer ergonomics are incomplete | High | Add a first-class receive API that creates payment targets and resolves inbound payment context |
| invoices / payment links | Creates payable requests and shareable payment links | Missing | No stable invoice or payment-link layer yet | Medium | Add invoice and payment-link objects on top of receive flows |
| history / receipts | App-level transaction history linked to payment receipts | Partial | History and receipt storage are not yet unified into one readable record stream | High | Persist normalized history entries and attach receipts to each send/receive event |
| contacts | Persistent named recipients for repeat payments | Partial | Contact metadata exists only as a concept, not a polished SDK feature | Medium | Add contact CRUD plus alias-to-address resolution |
| safeguards / approval flow | Policy checks, blocks, and escalations before money moves | Partial | Safety intent is clear, but approval flow and outcomes are not yet explicit enough | High | Implement policy evaluation, approval requests, and stable allowed/blocked/escalated results |
| storage boundary | Separate persistence boundary for wallet state, contacts, receipts, and metadata | Partial | Storage concerns are not fully isolated from business logic | High | Define a storage interface and move persistence behind it |
| signer boundary | Separate signing/custody boundary from SDK business logic | Partial | Signer access is not yet clearly isolated | High | Introduce a signer interface with unlock and sign responsibilities only |
| chain boundary | Separate Solana RPC/transaction boundary from product logic | Partial | Chain access is still too close to higher-level behavior | High | Add a chain adapter boundary for reads, submits, and confirmation lookup |
| error codes / result types | Stable machine-readable errors and structured results | Partial | Errors are not yet normalized into a durable SDK contract | High | Define error codes, typed result objects, and explicit failure categories |
| payment protocol normalization for receive flows (x402/MPP) | Receive flows normalize common payment metadata and wrappers | Partial | Hoshi should support this, but only at the receive layer | Medium | Add normalization adapters for x402 and MPP receive metadata without expanding scope beyond payments |
| DeFi / swap / yield / cross-chain | Deferred beyond core bank-account scope | Out of scope | Not part of the bank-account layer | Low | Keep these as later-phase capabilities and do not introduce them into the core facade |

## Next Slice For SDK Only

1. Lock the single-class facade and wallet lifecycle contract.
2. Normalize balance, send, receive, history, and receipt result types.
3. Add explicit storage, signer, and chain boundaries.
4. Finish safeguards and approval outcomes for send flows.
5. Add receive-side payment normalization for x402 and MPP.
