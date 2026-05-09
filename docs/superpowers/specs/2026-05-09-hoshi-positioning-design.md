# Hoshi Positioning Design

## Purpose

Define the product positioning for Hoshi so product, design, docs, and go-to-market work from the same v1 framing.

## Problem

AI agents can increasingly take actions, call APIs, and coordinate tasks, but payments remain unreliable at the agent layer.

Current market gaps:
- Most payment flows are designed for humans, not autonomous or semi-autonomous agents.
- Agent builders need safe payment rails before they need sophisticated financial strategy.
- Existing narratives often over-rotate into generic DeFi, trading, or broad crypto automation, which creates confusion for buyers.
- Teams adopting agentic products need a clear trust story around payment authorization, execution, and settlement.

The v1 problem Hoshi solves is narrow and concrete: help AI agents pay safely and get paid on Solana.

Internally, the product should be designed toward near t2000-style feature parity over time across SDK, engine, and MCP, adapted for Solana-native agent payments.

## Buyers

### Primary buyers

- Consumer AI agent apps that need embedded agent-native payment flows.
- Agent developers building products, tools, or frameworks that need payment infrastructure.

### Buyer needs

- A simple way to add payment capability to agents.
- Safe defaults around payment execution.
- Protocol-native support for agent payment standards.
- A product that feels infrastructure-grade, not speculative.

## Non-Goals

- Do not position Hoshi as a generic DeFi copilot.
- Do not position Hoshi as a trading assistant, yield optimizer, or portfolio manager.
- Do not position Hoshi as an Audric clone or copycat agent shell.
- Do not present Hoshi as a t2000 clone in identity, brand, or market narrative.
- Do not lead with future concepts like negotiation, shopping, escrow, or autonomous commerce orchestration.
- Do not present APP as a required core primitive for v1.

## Category

Hoshi is agent payment infrastructure on Solana.

Short category framing:
- Infra-first product for agent payments.
- Safe payment rails for AI agents.
- Developer-facing infrastructure with simple end-user framing.

## Narrative

The market does not need another broad AI x crypto story. It needs a focused trust layer for agent payments.

Hoshi starts with the most defensible wedge: enabling AI agents to pay safely and get paid on Solana. The product narrative should stay simple at the surface. Buyers should quickly understand what Hoshi does, who it is for, and why it matters. Under that simple story, Hoshi earns its moat through protocol alignment, payment safety, and clean infrastructure boundaries.

The company story is balanced by design:
- Infra-first in product architecture and credibility.
- Simple in market narrative and buyer comprehension.
- Solana-native in protocols and execution model, not a port of someone else's brand.
- Open to future commerce flows, but disciplined about what leads v1.

Internally, the roadmap and system design should assume Hoshi grows toward a t2000-style depth model across `sdk`, `engine`, and `mcp`, while externally the story stays narrow and clear.

## Product Promise

Core positioning:

> Hoshi helps AI agents pay safely and get paid on Solana.

Tagline:

> Safe payments for AI agents.

What the promise implies:
- Hoshi is focused on payment execution and payment acceptance.
- Safety is a first-order product property, not a secondary feature.
- Solana is the execution environment, not a background implementation detail.

## V1 Scope and Architecture Intent

V1 should stay tightly scoped around agent payment primitives, but the architecture should be shaped for phased delivery toward broader capability depth.

In scope:
- Sending payments from agents.
- Receiving payments for agent actions or services.
- Supporting x402 and MPP as the core protocol standards.
- Clear developer integration surfaces.
- Safety controls and reliable execution framing.
- First versions of `sdk`, `engine`, and `mcp` with stable core boundaries.

Out of scope for v1 lead messaging:
- APP-led routing or orchestration.
- Negotiation workflows.
- Shopping flows.
- Escrow or dispute systems.
- General-purpose agent operating environment.

APP may exist later as an optional plugin or extension layer, but it should not define the base product story.

Architecture intent:
- Design v1 packages and interfaces so they can grow toward near t2000-style feature parity overall for `sdk`, `engine`, and `mcp`.
- Ship that depth in phases rather than waiting for full parity before launch.
- Keep identity and messaging distinct: Hoshi is Solana-native agent payment infrastructure, not a copy of another product.

## Architecture Framing

Architecture should reinforce the positioning: Hoshi is infra-first, with product simplicity on top.

Recommended framing:
- Protocol-aligned payment infrastructure at the base.
- A production-grade `sdk` as the single facade for Solana agent finance flows.
- An `engine` layer that starts with policy and execution controls, then evolves into a QueryEngine-style orchestration runtime.
- An `mcp` layer treated as a first-class product with a stable tool surface and t2000-style polish over time.

This lets external messaging stay concise while internal implementation remains modular and defensible.

## Protocol Layering

Protocol stance for v1:
- x402 is core.
- MPP is core.
- APP is optional later.

Implications:
- Hoshi should speak clearly about standards compatibility where useful.
- x402 and MPP should be treated as foundational integration and ecosystem anchors.
- APP should be framed as future extensibility, not required architecture.

Suggested layering:
1. Settlement and chain layer: Solana.
2. Payment protocol layer: x402 and MPP.
3. Hoshi infrastructure layer: safety, execution, routing, acceptance, observability.
4. Application layer: agent apps, developer tools, consumer agent products.

## Product Surfaces

The product model should mirror the long-term architecture target while keeping the initial release simple.

Recommended responsibility split:
- `sdk`: the single-facade, production-grade Solana agent finance SDK for builders.
- `engine`: payment execution, authorization, policy, routing, state, and later orchestration/runtime behavior.
- `mcp`: a first-class tool product for agent environments with stable primitives, predictable semantics, and high integration polish.
- Core protocol adapters: implement x402 and MPP integration boundaries.
- Optional plugin layer: future APP or advanced workflow integrations.

Principle:
- Keep the core path opinionated and narrow.
- Add optional expansion surfaces without bloating the main mental model.
- Let `sdk`, `engine`, and `mcp` deepen over time toward the parity target rather than fragmenting into unrelated products.

## Roadmap Phases

### Phase 1: Agent payments foundation

Goal:
- Establish Hoshi as the safe payments layer for AI agents on Solana.
- Ship the first credible slice of the long-term `sdk` / `engine` / `mcp` architecture.

Deliverables:
- Core x402 support.
- Core MPP support.
- Outbound and inbound payment flows.
- Basic safety and policy controls.
- Clean developer onboarding path.
- Initial single-facade SDK, initial engine runtime, and initial MCP tool surface.

### Phase 2: Workflow expansion

Goal:
- Extend from payment primitives into richer runtime and integration depth without changing the core positioning.

Possible additions:
- Deeper SDK ergonomics and production features.
- Engine evolution beyond policy-only flows into QueryEngine-style orchestration.
- MCP expansion with more stable tools, richer semantics, and stronger developer experience.
- Multi-step payment coordination, routing, and observability.
- Optional APP plugin.

### Phase 3: Broader agent commerce

Goal:
- Approach near t2000-style capability depth overall, adapted for Solana-native agent finance and commerce.

Possible additions:
- Negotiation.
- Shopping.
- Escrow.
- More complex agent-to-agent economic coordination.
- Optional APP-driven experiences where they improve outcomes.

Rule for all later phases:
- Future breadth should extend the payment thesis, not replace it.

## Competitive Differentiation

Hoshi should differentiate on focus, trust, and protocol grounding.

Key differentiators:
- Narrower and clearer than broad AI x crypto products.
- More infrastructure-native than consumer-first agent wrappers.
- More credible for payment use cases than generic agent copilots.
- Built around agent payment standards instead of retrofitting human payment flows.
- Simple top-line narrative with technical moat underneath.

Competitive stance:
- Do not compete on breadth of agent behaviors in v1.
- Compete on clarity, safety, and integration credibility.

## Risks

### Positioning risk

Risk:
- Messaging drifts into abstract agent commerce or generic DeFi language.

Mitigation:
- Keep every primary asset anchored to payment, safety, agents, and Solana.

### Product scope risk

Risk:
- Future ideas dilute v1 and create a confusing surface area, or the team under-builds core architecture by treating Hoshi as policy-only payments.

Mitigation:
- Treat expansion features as roadmap context, not homepage identity.
- Keep the phased plan explicitly anchored to long-term `sdk`, `engine`, and `mcp` depth.

### Ecosystem dependency risk

Risk:
- Overdependence on standards that are still evolving.

Mitigation:
- Keep adapters modular and keep Hoshi's safety and execution layer product-owned.

### Buyer confusion risk

Risk:
- Buyers may not immediately distinguish Hoshi from wallets, payment APIs, or agent shells.

Mitigation:
- Repeatedly state that Hoshi is payment infrastructure for AI agents, not a general agent UI or trading product.

## Decision Log

- Decision: Hoshi is infra-first and balanced.
  Rationale: Product credibility should come from infrastructure depth, while messaging remains simple enough for fast comprehension.

- Decision: Core positioning is "Hoshi helps AI agents pay safely and get paid on Solana."
  Rationale: This is the clearest statement of user value and product scope.

- Decision: Tagline is "Safe payments for AI agents."
  Rationale: It is short, concrete, and aligned with the v1 wedge.

- Decision: First buyers are consumer AI agent apps and agent developers.
  Rationale: These are the earliest users with immediate integration demand.

- Decision: x402 and MPP are core; APP is optional later.
  Rationale: This keeps the protocol story strong without overcomplicating v1.

- Decision: Hoshi should target near t2000-style feature parity overall across `sdk`, `engine`, and `mcp`, adapted to Solana.
  Rationale: This sets the right architecture bar internally without forcing derivative external messaging.

- Decision: V1 ships in phases against that target rather than waiting for full capability depth.
  Rationale: The wedge is narrow, but the system should not be architecturally narrow.

- Decision: `engine` should evolve beyond policy-only enforcement into a QueryEngine-style orchestration runtime.
  Rationale: Payment intelligence, routing, and tool coordination belong in a deeper runtime over time.

- Decision: `mcp` is a first-class product surface and `sdk` is the primary single-facade integration surface.
  Rationale: Both need durable interfaces and production polish to support the long-term product shape.

- Decision: Do not position Hoshi as a generic DeFi copilot or Audric clone.
  Rationale: Those narratives weaken clarity and make the category feel derivative.

- Decision: Narrative should stay simple, with technical moat under the hood.
  Rationale: Buyer comprehension should be fast even if implementation depth is substantial.

- Decision: Future expansions should be acknowledged but should not lead v1 messaging.
  Rationale: Payment trust is the wedge; broader agent commerce can come later.
