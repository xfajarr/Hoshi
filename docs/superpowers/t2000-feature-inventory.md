# t2000 Feature Inventory for Hoshi Comparison

Source repo: `mission69b/t2000`.

This document captures the feature inventory researched in the repo and summarizes it for Hoshi comparison. It keeps the surface area organized by product layer so the overlap and gaps are easy to see.

## Product Architecture

- Infra-first agent finance stack on Solana.
- Core layers: `sdk`, `engine`, `mcp`, `gateway`, and `cli`.
- Main product thesis: safe payments for AI agents, with x402 and MPP as core protocol layers and APP deferred as an optional future extension.
- Architecture intent: a narrow public surface with deeper internal capability underneath.
- Flow model:
  - `sdk` = single facade for Solana agent finance.
  - `engine` = policy, approval, execution, and runtime orchestration.
  - `mcp` = first-class agent tool surface with stable semantics.
  - `gateway` = metered, paid HTTP proxy layer.
  - `cli` = local developer workflow and wallet operations.
- Product promise from the research: help AI agents pay safely and get paid on Solana.

## Consumer App Features

The repo research points to a consumer-facing agent finance surface rather than a broad AI shell.

- Wallet creation and registration.
- Wallet loading and signer attachment.
- Balance reads for SOL and USDC.
- Full balance views across SOL plus token holdings.
- Wallet metadata and wallet history / receipt views.
- Safe send flows with unsigned build mode and signed on-chain submission mode.
- Invoice creation.
- Shareable payment link creation.
- Swap quotes via Jupiter.
- Yield strategy discovery, deposits, and withdrawals via Kamino.
- Contact management with saved address aliases.
- Policy/guardrail setup for spend limits and asset allowlists.
- Wallet classification and receipt summaries for operational visibility.

## SDK

The SDK is the broadest feature layer in the inventory.

- Core result/error pattern with explicit `Result<T, E>` handling.
- Solana chain adapter, signer adapter, encrypted keypair vault, and in-memory storage.
- Wallet service for create/load/manage flows.
- Transfer service for outbound movement.
- Invoice service for inbound payment flows.
- Swap service with Jupiter integration.
- Yield service with Kamino integration.
- Payment model layer for x402 and MPP serialization.
- Token registry and Solana-specific constants.
- Contacts manager for named address aliases.
- Safeguards/enforcer layer for outbound-operation controls.
- Wallet utilities for classification, summary, and balance parsing.
- Browser wallet detection helpers.
- Payment primitives from the later plan work:
  - `pay`
  - `receive`
  - `createInvoice`
  - `createPaymentLink`
- Solana-specific asset support includes SOL, USDC, USDT, ETH, and BTC in the registry.
- Guardrail constants cover gas reserve, auto-topup thresholds, fee ceilings, and allowed-asset rules.

## Engine

The engine is the policy and execution control layer, with runtime/orchestration evolution planned in the research.

- Policy rule schema and evaluation context.
- Policy actions: `allow`, `block`, and `escalate`.
- Conditions for max amount, daily limit, recipient allowlist, action type, asset type, and time window.
- Approval request tracking with pending/approved/rejected/expired states.
- Execution result model with success, approval linkage, and structured errors.
- In-memory policy store and approval store.
- Execution service for policy-bound operations.
- Runtime evolution in the plan:
  - runtime jobs
  - runtime events
  - runtime execution state
  - runtime store port
  - memory runtime store
  - payment runtime orchestrator
  - minimal event loop for preview/approval/execute flows
- The intended direction is from policy-only control into a QueryEngine-style runtime.

## MCP

The MCP server is treated as a core product surface, not a thin adapter.

- Stdio JSON-RPC transport on stdin/stdout.
- Library-grade startup API rather than CLI-only startup.
- Stable tool catalog with deterministic registration order.
- HTTP transport support in the newer app layer.
- Built-in endpoints for:
  - health
  - skills listing and skill detail
  - tool listing and tool detail
  - skill matching
- Payment-first tool surface:
  - `hoshi_balance`
  - `hoshi_balances`
  - `hoshi_wallet_info`
  - `hoshi_history`
  - `hoshi_swap_quote`
  - `hoshi_yield_strategies`
  - `hoshi_yield_positions`
  - `hoshi_create_invoice`
  - `hoshi_create_payment_link`
  - `hoshi_wallet_create`
  - `hoshi_send`
  - `hoshi_deposit_yield`
  - `hoshi_withdraw_yield`
- Tool categories include `read`, `write_safe`, and `write_escalated`.
- Skills are loaded alongside tools and exposed for discovery and matching.

## CLI

The CLI is the local operator surface.

- Binary name: `hoshi`.
- Core flags:
  - `--rpc`
  - `--mainnet`
  - `--keypair`
  - `--json`
  - `--yes`
- Local state lives under `~/.hoshi/`.
- Primary commands visible in the repo:
  - `create`
  - `wallet:create`
  - `send`
  - `pay`
  - `swap`
  - `stake`
  - `save`
  - `deposit`
  - `lock`
  - `history`
  - `contacts`
  - `config`
  - `address`
  - `gas`
  - `earnings`
  - `serve`
  - `exportKey`
  - `mcp`
  - `init`
- CLI wallet creation includes encrypted keystore setup, default guardrails, and optional devnet airdrop support.
- CLI send flows support both unsigned transaction building and signed submission.

## Gateway

The gateway is a metered HTTP proxy for paid API access.

- Hono-based HTTP server.
- Sample upstream services include OpenAI-style and Anthropic-style endpoints.
- Routes:
  - `/health`
  - `/services`
  - `/services/:id`
  - `/stats`
  - `/proxy/:serviceId/*`
- x402 middleware enforces payment before proxying.
- Payment requirement payload includes network, token, amount, recipient, and optional deadline.
- Payment proof is carried in an `X-Payment` header.
- Requests are recorded with request id, endpoint path, payment proof, timestamp, and client IP.
- The shipped implementation is demo-grade and explicitly expects persistent registry and settlement plumbing later.

## Skills / Recipes

The repo includes markdown-based agent skills for MCP usage.

- Wallet Management.
- Transfer.
- Swap.
- Yield.
- Invoicing.
- Policy Management.
- Each skill contains:
  - triggers
  - tool list
  - system prompt
  - examples
  - guardrails
- Skills are used to route intent, set context, constrain tools, and enforce safety.
- The MCP server exposes skill discovery, skill detail, and skill matching endpoints.

## Security / Infra

- Policy-bound autonomy is a first-order design rule.
- Spend limits, daily limits, asset allowlists, and escalation rules are core guardrails.
- Managed wallets use encrypted local keystores.
- Signer attachment is explicit and wallet-matched before submission.
- Keys are local only; no repo-committed keypairs.
- Gateway payment enforcement is designed around x402-style metering.
- MCP stdio servers are assumed to be spawned by trusted hosts.
- Production notes call out private/rate-limited RPC endpoints for real deployments.
- The repo is MVP-grade and expects external compliance review for production use.

## What Matters Most for Hoshi

- The real moat is the combination of payment primitives, policy, and agent tooling, not any single feature.
- The clearest reusable pattern is a narrow public surface backed by deeper SDK/engine/MCP infrastructure.
- x402 and MPP are the most important protocol anchors to preserve.
- CLI and gateway matter as operator and monetization surfaces, but they should not blur the core payments story.
- APP-style breadth is explicitly deferable; the v1 center of gravity is safe pay/get-paid flows on Solana.
