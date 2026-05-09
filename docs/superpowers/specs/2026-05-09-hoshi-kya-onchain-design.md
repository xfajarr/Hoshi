# Hoshi KYA Onchain Design

## Purpose

Define the first onchain Solana registry for Hoshi KYA so `.hoshi` handles, ownership, and reputation live onchain as the source of truth.

## Problem

Hoshi KYA already exists in the SDK as a client-facing identity layer, but the identity and trust model needs a canonical onchain registry.

Without an onchain registry:
- handles are only local or app-specific,
- identity cannot be reliably verified across apps,
- reputation is not portable or trustable as a shared source of truth,
- and the `.hoshi` namespace can drift into inconsistent offchain implementations.

The onchain program must solve the core identity problem, not become a full social or credential system.

## Product Shape

Hoshi KYA is the identity and trust layer for AI agents on Solana.

V1 combines:
- `.hoshi` handle ownership,
- agent identity metadata,
- direct reputation score updates,
- Hoshi-issued attestations.

## Core Decisions

- Framework: **Anchor**
- Namespace: **`.hoshi`**
- Claim model: **open claim**
- Handle limit: **one `.hoshi` handle per wallet**
- Reputation model: **direct score deltas**
- Attestation issuer in v1: **Hoshi only**
- Source of truth: **onchain registry program**

## Goals

1. Let anyone claim a `.hoshi` handle for their AI agent.
2. Ensure a handle is owned by exactly one wallet.
3. Ensure a wallet can own only one `.hoshi` handle.
4. Store a readable identity record onchain.
5. Track reputation with simple, explicit score changes.
6. Keep the program small, auditable, and easy for the SDK to consume.

## Non-Goals

- Not a generic name-service replacement.
- Not a multi-handle identity system.
- Not a full reputation marketplace.
- Not a social graph.
- Not multi-issuer attestations in v1.
- Not offchain-first identity with onchain theater.

## Program Overview

The Anchor program should expose a minimal registry for KYA.

The program owns three responsibilities:
1. **Claim identity** — register a new `.hoshi` handle.
2. **Read identity** — expose the stored profile and reputation.
3. **Update reputation** — apply direct score deltas from Hoshi-issued attestations.

The SDK remains the main developer API, but the program is the canonical ledger.

## Account Model

### 1) Registry Account

A global config account for the program.

Responsibilities:
- store program authority or config flags,
- optionally store the Hoshi issuer public key,
- support future policy updates without changing the account layout.

### 2) Identity Account

One account per `.hoshi` handle.

Suggested PDA seeds:
- `b"identity"`
- normalized handle bytes

Fields:
- handle,
- owner wallet,
- display name,
- metadata URI,
- reputation score,
- attestation count,
- created_at,
- updated_at.

### 3) Wallet Index Account

One account per wallet to enforce the one-handle rule.

Suggested PDA seeds:
- `b"wallet"`
- owner wallet public key

Fields:
- owner wallet,
- handle currently owned,
- created_at,
- updated_at.

This lets the program reject a second claim from the same wallet.

### 4) Attestation Event Reference

For v1, attestations do not need a separate giant onchain history structure.

Instead, the program should store:
- the latest score,
- the attestation count,
- and an optional event reference or hash for traceability.

That keeps state compact while still making the trust model auditable.

## Handle Rules

Handle format:
- lowercase canonical form,
- must end in `.hoshi`,
- human-readable label before the suffix,
- unique across the program.

Validation rules:
- one handle per wallet,
- one wallet per handle,
- no empty label,
- no invalid characters,
- normalize input before claim.

## Instructions

### `initialize_registry`

Initial program setup.

Responsibilities:
- create or initialize the registry config account,
- optionally set the Hoshi issuer key,
- establish any future policy knobs.

### `claim_handle`

Open claim instruction.

Inputs:
- handle,
- display name,
- metadata URI optional.

Checks:
- handle ends with `.hoshi`,
- handle is available,
- wallet does not already own a handle,
- signer matches the wallet owner.

Effects:
- create the identity account,
- create the wallet index account,
- initialize reputation to zero.

### `update_reputation`

Apply a direct delta to a handle’s reputation.

Inputs:
- handle,
- delta,
- reason or reference,
- attestation metadata.

Checks:
- issuer is Hoshi,
- identity exists,
- delta is valid,
- signer/authority is allowed to issue the update.

Effects:
- add delta to score,
- increment attestation count,
- update timestamps,
- optionally store a reference to the attestation event.

### `resolve_handle`

Read-only identity lookup.

Returns:
- handle,
- owner,
- display name,
- metadata URI,
- score,
- attestation count,
- timestamps.

## Data Model

### Identity

Contains:
- `handle: String`
- `owner: Pubkey`
- `display_name: String`
- `metadata_uri: Option<String>`
- `reputation_score: i64`
- `attestation_count: u64`
- `created_at: i64`
- `updated_at: i64`

### Registry Config

Contains:
- `authority: Pubkey` or issuer config,
- optional policy flags for future use.

### Wallet Index

Contains:
- `owner: Pubkey`
- `handle: String`
- `created_at: i64`
- `updated_at: i64`

## SDK Integration

The SDK should remain the primary client surface.

It should call the program for:
- claim,
- resolve,
- reputation updates,
- ownership checks.

The SDK’s in-memory registry is only a bridge for local development and tests until the Anchor program is live.

## Flows

### Claim flow

1. User/app unlocks the signer with PIN.
2. SDK calls `claim_handle`.
3. Program validates open claim rules.
4. Program writes identity and wallet index accounts.
5. SDK returns the canonical profile.

### Reputation flow

1. Hoshi issues an attestation.
2. SDK submits the attestation as a reputation update.
3. Program applies the direct score delta.
4. SDK reads the updated score.

### Read flow

1. App resolves `name.hoshi`.
2. SDK queries the program account.
3. App receives identity and reputation data.

## Security Considerations

- Open claim can invite squatting, so uniqueness and one-handle-per-wallet rules must be enforced strictly.
- Reputation updates must be authority-gated so only Hoshi can issue v1 attestations.
- Handle normalization must happen before PDA derivation to avoid duplicate encodings.
- Account sizes should be conservative to avoid realloc complexity in v1.
- The program should avoid storing unnecessary attestation history until a real need appears.

## Testing Strategy

### Program tests should verify:
- a new handle can be claimed by any wallet,
- the same handle cannot be claimed twice,
- the same wallet cannot claim two handles,
- handle normalization is consistent,
- reputation deltas apply correctly,
- only Hoshi can issue attestation-driven updates,
- resolve returns the expected identity data.

### SDK integration tests should verify:
- the SDK can map `.hoshi` handles to the onchain identity model,
- claim and resolve behave the same in SDK and program-backed paths,
- PIN unlock remains host-managed and does not leak into the program.

## Risks

### Namespace squatting

Open claim can lead to speculative registration.

Mitigation:
- keep one handle per wallet,
- keep claim rules explicit,
- add future reservation or anti-abuse controls only if needed.

### Reputation abuse

If issuer authority is too broad, trust becomes meaningless.

Mitigation:
- Hoshi-only issuer in v1,
- direct deltas only,
- keep attestation reasons traceable.

### Account bloat

Storing too much history onchain can make accounts heavy.

Mitigation:
- store only current score and count in v1,
- defer full attestation logs to later phases.

## Roadmap

### Phase 1
- scaffold Anchor program,
- implement registry config,
- implement open claim,
- implement one-handle-per-wallet constraint,
- implement reputation delta updates.

### Phase 2
- connect SDK to the Anchor program,
- replace in-memory registry usage in production paths,
- add richer attestation references if needed.

### Phase 3
- expand issuer support if the ecosystem needs it,
- consider richer reputation semantics after v1 is stable.

## Decision Log

- Decision: Anchor is the framework.
  Rationale: fastest standard path for a Solana program in this repo.

- Decision: claims are open.
  Rationale: users should be able to create names for their AI agents without approval bottlenecks.

- Decision: one `.hoshi` handle per wallet.
  Rationale: prevents handle hoarding and keeps identity clean.

- Decision: reputation uses direct score deltas.
  Rationale: simplest shippable trust model with clear onchain semantics.

- Decision: Hoshi is the only issuer in v1.
  Rationale: it keeps the trust model simple until the product matures.
