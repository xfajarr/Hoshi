# t2000 to Hoshi Feature Mapping / Gap Matrix

This is a Hoshi comparison doc, with `t2000` as the reference point. It focuses on the areas that matter most for Hoshi: engine/runtime depth and payment rails, especially `x402` + `MPP`.

| Area | t2000 feature | Hoshi status | Gap | Priority | Notes |
|---|---|---:|---|---|---|
| Engine | Policy, approval, execution, runtime orchestration | partial | Hoshi has policy/evaluation and execution rules, but not the full runtime/orchestration layer | high | This is the core depth gap. |
| Engine | Query loop / event loop runtime | not started | No QueryEngine-style loop, runtime jobs, or effect orchestration | high | This is the next missing slice after policy. |
| Engine | Approval state and execution tracking | partial | Hoshi has policy-bound actions, but not the same runtime job/state model | high | Needs a clearer runtime execution contract. |
| SDK | Wallet, pay, receive, invoice, payment link facade | partial | Hoshi has wallets, transfers, invoices, and receipts, but not a unified payment-first facade | high | Wallet/pay/receive should be one clean API surface. |
| SDK | Shared payment models for `x402` + `MPP` | not started | No canonical shared serialization layer for both protocols | high | This is a key protocol foundation. |
| SDK | Balance, swap, yield, contacts, receipt primitives | done | Hoshi already covers much of this broader treasury surface | medium | Useful capability, but not the main parity wedge. |
| MCP | First-class tool surface with stable semantics | partial | Hoshi has MCP tools, but the tool catalog is narrower and less structured than t2000 | high | Tool surface should be payment-first and deterministic. |
| MCP | Startup API and registration order | partial | Hoshi exposes MCP, but not as a clean library-grade startup surface | medium | Needed for embedding and predictable integration. |
| MCP | Skill discovery / skill matching endpoints | not started | No equivalent first-class MCP skill routing layer | medium | Useful if Hoshi keeps recipes/skills as a product surface. |
| CLI | Local operator wallet and payment workflows | partial | Hoshi CLI exists, but it is narrower than the t2000 operator surface | medium | Good support surface, not the main gap. |
| Gateway | Metered, paid HTTP proxy | partial | Hoshi has an x402-guarded gateway, but it is still demo-grade | high | This is part of the payment rails story, not just infrastructure. |
| Gateway | Payment protocol enforcement and settlement plumbing | not started | No full `x402` + `MPP` settlement/rail implementation | high | The gateway needs real protocol-backed payment flow. |
| Consumer app / Audric | Consumer-facing agent finance surface | not started | Hoshi intentionally does not ship a broad consumer shell | low | This is a deliberate product choice, not a bug. |
| Consumer app / Audric | Wallet create/load, balances, history, send, receive, swaps, yield | not started | Hoshi exposes these capabilities as infrastructure, not a consumer app | low | Keep the surface narrow unless product direction changes. |
| Skills / recipes | Markdown skills with triggers, tool lists, examples, and guardrails | partial | Hoshi has skills/docs material, but not a full recipe system tied to MCP behavior | medium | Guards/recipes should support safe payment flows. |
| Skills / recipes | Intent routing and action guardrails | partial | Hoshi has policy rules, but not the same recipe-driven intent layer | medium | This is adjacent to the engine, not separate from it. |
| Security / infra | Policy-bound autonomy, spend limits, allowlists, escalation | partial | Hoshi already has guardrail concepts, but they are not yet paired with runtime/payment rails | high | Safety needs to sit directly on the execution path. |
| Security / infra | Encrypted local wallets and trusted-host assumptions | partial | Hoshi has local key storage patterns and RPC guidance, but not the full production posture | medium | Keep custody boundaries explicit. |

## Next Slice

The next implementation focus should be **engine runtime + payment protocol rails first**: build the QueryEngine-style loop, then add the shared `x402` / `MPP` payment model layer and wire it through SDK, MCP, and gateway surfaces.
