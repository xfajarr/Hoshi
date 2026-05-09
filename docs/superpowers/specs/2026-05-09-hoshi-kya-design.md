# Hoshi KYA Design

## Purpose

Define Hoshi KYA v1: an agent identity and trust layer for Solana that combines wallet signing, `.hoshi` handles, and hybrid reputation into one coherent product surface.

## Problem

Hoshi already needs a safe payment layer for AI agents, but agents also need a trustworthy identity layer.

Today, agent apps can have a wallet and sign transactions, but they still lack:
- a canonical agent handle,
- a durable identity record,
- a trust/reputation signal,
- and a clear way to connect those pieces to signing authority.

Without that layer, agent apps feel anonymous, easy to spoof, and hard to trust. For Hoshi, this becomes especially important because the product is moving toward a t2000-style model where identity, signing, and reputation are part of the core experience.

## Product Definition

Hoshi KYA means:
- **K**now
- **Y**our
- **A**gent

It is the brand and product layer for agent identity on Hoshi.

V1 should combine:
- **wallet**: custody and signing authority,
- **signing**: who can authorize actions,
- **identity**: a canonical `.hoshi` handle,
- **reputation**: onchain score informed by attestations.

## Core Decisions

- Namespace: `.hoshi`
- Auth model: PIN-style unlock, not password-first UX
- Identity source of truth: onchain registry
- Reputation model: hybrid, with onchain score plus attestations as input
- Attestation issuer for v1: Hoshi only
- Product layering: brand layer first, then SDK module, then onchain registry program

## Goals

1. Give every Hoshi agent a readable identity like `namaagent.hoshi`.
2. Make signing authority explicit and separable from identity.
3. Provide a trust layer that apps can read before allowing agent actions.
4. Keep the first version small enough to ship without turning Hoshi into a full identity protocol too early.
5. Make the SDK the main integration surface while keeping the onchain program as source of truth.

## Non-Goals

- Not a generic ENS clone.
- Not a broad decentralized social graph.
- Not a full reputation marketplace in v1.
- Not multi-issuer attestations yet.
- Not a password-based wallet UX.
- Not a full offchain identity system pretending to be onchain.

## Architecture

### 1) Brand/Product Layer

**Hoshi KYA** is the user-facing concept.

It should communicate:
- this agent has a wallet,
- this agent can sign,
- this agent owns a `.hoshi` identity,
- this agent has a visible trust profile.

This layer is what users and developers see in copy, UI, and docs.

### 2) SDK Module

The SDK is the first implementation surface.

It should expose:
- claim/register identity,
- resolve `.hoshi` handles,
- read profile and reputation,
- verify signer ownership,
- submit attestation-related actions,
- expose PIN-style unlock support through the host layer.

The SDK should feel like a module inside `hoshi-sdk`, not a separate identity product.

### 3) Onchain Registry Program

The Solana program is the source of truth for:
- handle ownership,
- identity metadata,
- reputation score,
- attestation references or hashes.

The registry should be simple enough to audit and stable enough to be treated as canonical by the SDK.

## Module Boundaries

### `packages/hoshi-sdk/src/kya/*`

Client-facing KYA APIs.

Expected responsibilities:
- resolve handles,
- claim handles,
- fetch profiles,
- verify ownership,
- read reputation,
- submit Hoshi-issued attestation flows.

### `packages/hoshi-sdk/src/signer/*`

Signing abstraction.

Expected responsibilities:
- support PIN-style unlock via host integration,
- provide signer identity to KYA flows,
- keep key management separate from registry logic.

### `programs/hoshi-kya/*`

Onchain registry.

Expected responsibilities:
- initialize identity records,
- enforce ownership,
- store reputation state,
- append or reference attestation events.

## Data Model

### Handle

Example:
- `namaagent.hoshi`

Rules:
- canonical and human-readable,
- unique,
- owned by one agent identity,
- suitable for display and resolution.

### Identity

Contains:
- handle,
- owner wallet public key,
- display name,
- optional metadata URI,
- optional avatar or profile fields,
- creation and update timestamps.

### Reputation

Contains:
- numeric score,
- score history or last update checkpoint,
- attestation-derived inputs,
- status flags such as verified or restricted if needed later.

### Attestation

For v1, attestations are issued by Hoshi only.

An attestation should include:
- subject agent identity,
- issuer,
- type,
- payload or reason,
- timestamp,
- optional reference to the triggering event.

## Flows

### Claim flow

1. Host/app unlocks the signer with PIN.
2. SDK submits a claim transaction.
3. Registry checks handle availability and signer ownership.
4. Registry writes the identity record.
5. SDK returns the resolved identity to the app.

### Read flow

1. App resolves `name.hoshi`.
2. SDK fetches registry data.
3. App receives identity, owner, and reputation summary.

### Reputation update flow

1. Hoshi issues an attestation after an observed event.
2. SDK submits the attestation input or reference.
3. Registry updates the onchain score.
4. App reads the updated trust state.

### Signing flow

1. Host/app authenticates user with PIN.
2. Host provides unlocked signer to SDK.
3. SDK uses signer for agent actions.
4. KYA identity remains separate from custody but linked to it.

## Auth Model

Hoshi KYA should not reintroduce a password-first model.

Instead:
- the host manages the UX,
- the wallet uses PIN-style unlock semantics,
- the SDK receives a signer only after successful unlock,
- the registry never stores a secret.

This keeps auth aligned with the t2000-style flow the user referenced while still making Hoshi-specific custody and trust boundaries clear.

## Reputation Model

KYA v1 uses a **hybrid reputation model**:
- onchain score is the visible trust value,
- attestations are the input to that score,
- Hoshi is the only issuer in v1.

Why this shape:
- score is simple to read,
- attestations preserve traceability,
- Hoshi can ship the system without needing a public issuer network on day one.

The score should be easy for apps to consume without understanding the full attestation history.

## Testing Strategy

- Claiming a `.hoshi` handle should fail if the handle is already owned.
- Reading a profile should return the canonical owner and handle.
- Reputation updates should be deterministic given the same attestation input.
- Invalid signer ownership should block claim/update actions.
- PIN flow should remain host-managed and not leak into registry logic.
- SDK behavior should be testable against mocked registry and signer adapters.
- Onchain registry tests should verify ownership, uniqueness, and score updates.

## Risks

### Namespace squatting

If `.hoshi` claims are open too early, name squatting can happen.

Mitigation:
- start with a controlled issuance policy,
- add reservation rules later if needed,
- keep claim semantics explicit in the SDK.

### Reputation overfitting

A single score can become too opaque.

Mitigation:
- keep attestations as first-class inputs,
- make score derivation explainable,
- avoid complex hidden weighting in v1.

### Confusion with wallet identity

Users may assume identity and custody are the same thing.

Mitigation:
- clearly separate wallet, signer, identity, and reputation in API naming and docs.

### Scope creep

Identity products can expand into social, discovery, and credential systems.

Mitigation:
- keep v1 limited to handle, ownership, score, and Hoshi-issued attestations.

## Roadmap

### Phase 1: Product definition
- lock the KYA brand,
- define `.hoshi` as canonical namespace,
- define PIN-based auth language,
- define SDK surface.

### Phase 2: SDK module
- ship `hoshi-sdk` KYA client APIs,
- expose claim/read/verify helpers,
- add mocked or local registry support for integration testing.

### Phase 3: Onchain registry
- implement Solana registry program,
- persist handles, ownership, and score,
- connect SDK to program.

### Phase 4: Hoshi-issued attestations
- issue attestations from Hoshi activity,
- feed them into the score model,
- expose readable reputation outputs.

## Decision Log

- Decision: Hoshi KYA is the brand layer for identity and trust.
  Rationale: the product needs a clear trust story beyond payments.

- Decision: `.hoshi` is the canonical namespace.
  Rationale: it is short, brandable, and clearly tied to Hoshi.

- Decision: auth is PIN-style, not password-first.
  Rationale: this matches the desired t2000-like UX and keeps host-managed auth simple.

- Decision: reputation is hybrid.
  Rationale: score is easy to consume, attestations preserve traceability.

- Decision: Hoshi is the only issuer in v1.
  Rationale: it keeps the system shippable before opening the issuer ecosystem.
