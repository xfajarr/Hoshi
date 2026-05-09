# Hoshi KYA SDK Wiring Design

## Purpose

Define how the existing `hoshi-sdk` KYA client becomes program-backed, using the Anchor registry as the source of truth while keeping the public API stable.

## Problem

Hoshi KYA currently exists in two layers:
- a program-backed Anchor registry on Solana,
- and an in-memory SDK registry used for local behavior.

That split is useful during development, but it is no longer the right production shape. The SDK must stop pretending the registry is local and instead read and write the real onchain state. Otherwise, apps will integrate against a surface that diverges from the canonical `.hoshi` namespace and reputation model.

The goal is not to redesign the API. The goal is to keep `Hoshi.kya.*` stable while swapping the backend to the Anchor program.

## Core Decision

KYA SDK wiring will be **program-backed only**.

That means:
- no in-memory fallback in production paths,
- no dual backend selection in `HoshiOptions`,
- no hidden registry behavior inside the SDK,
- the Anchor program is the only source of truth.

## Goals

1. Keep the public SDK API stable.
2. Make `Hoshi.kya` call the Anchor program directly.
3. Derive all KYA PDAs consistently from normalized handles and wallet keys.
4. Map Anchor account data back into the existing SDK profile/reputation shapes.
5. Keep testability high through mocked Anchor providers and local-validator tests.

## Non-Goals

- Not redesigning the KYA data model.
- Not changing `.hoshi` namespace rules.
- Not changing open-claim rules or one-handle-per-wallet rules.
- Not introducing a fallback in-memory registry for production.
- Not adding multi-program support.

## Architecture

### 1) SDK Facade

`packages/hoshi-sdk/src/kya/client.ts` remains the public interface used by `Hoshi.kya`.

It should continue to expose:
- `claimHandle`
- `resolveHandle`
- `getProfile`
- `issueAttestation`
- `updateReputation`

The facade should not expose Anchor-specific details to app developers.

### 2) Anchor Registry Adapter

Add a dedicated Anchor adapter under the KYA SDK layer.

Responsibilities:
- connect to the Anchor program,
- derive PDAs,
- submit instructions,
- fetch identity accounts,
- normalize onchain data into SDK objects.

This adapter becomes the only backend used by `KyaClient`.

### 3) Hoshi Integration Point

`Hoshi` should construct the KYA client with:
- the active chain connection,
- the current signer/wallet owner source,
- the Anchor program ID or program client.

The host/app still manages unlocking. The SDK just uses the available signer/wallet context.

## File Boundaries

### `packages/hoshi-sdk/src/kya/client.ts`

Public SDK facade.

Responsibilities:
- keep the same KYA method names,
- delegate to the Anchor adapter,
- normalize errors to SDK-friendly forms.

### `packages/hoshi-sdk/src/kya/anchor-registry.ts`

New Anchor-backed implementation.

Responsibilities:
- derive registry/identity/wallet PDAs,
- call `initializeRegistry`, `claimHandle`, `updateReputation`, `resolveHandle`,
- map Anchor accounts to `KyaProfile`.

### `packages/hoshi-sdk/src/kya/types.ts`

Shared KYA shapes.

Responsibilities:
- identity,
- reputation,
- attestation,
- profile contracts.

### `packages/hoshi-sdk/src/hoshi.ts`

Constructor wiring.

Responsibilities:
- instantiate the Anchor-backed KYA client,
- pass in wallet/signer context,
- keep the rest of Hoshi unchanged.

## Data Flow

### Claim

1. App unlocks the wallet.
2. `Hoshi` exposes the signer and owner pubkey.
3. `KyaClient.claimHandle()` normalizes the handle.
4. Anchor adapter derives identity and wallet PDAs.
5. SDK sends `claimHandle` to the program.
6. SDK returns the canonical profile.

### Resolve

1. App calls `resolveHandle('name.hoshi')`.
2. SDK derives the identity PDA.
3. SDK fetches the Anchor account.
4. SDK maps the account into `KyaProfile`.

### Reputation update

1. Hoshi-issued attestation is ready.
2. SDK sends `updateReputation` to the program.
3. Program applies the direct delta.
4. SDK returns the updated profile.

## PDA Strategy

Use the same normalized handle rules already defined in the SDK.

Suggested PDA seeds:
- `registry`: `b"registry"`
- `identity`: `b"identity" + normalized_handle`
- `wallet`: `b"wallet" + owner_pubkey`

Handle normalization must happen before PDA derivation to avoid duplicate encodings.

## Error Handling

The SDK should normalize Anchor and RPC errors into stable KYA errors where possible.

Expected cases:
- handle already exists,
- wallet already owns a handle,
- invalid handle,
- unauthorized issuer,
- missing identity account,
- missing registry config,
- RPC failure / transaction failure.

The public API should remain readable even if the underlying program emits Anchor-specific errors.

## Testing Strategy

### SDK tests against Anchor localnet
- claim a `.hoshi` handle against Anchor localnet,
- resolve the stored identity,
- update reputation and read it back,
- reject a second handle for the same wallet,
- reject unauthorized reputation updates,
- verify existing `Hoshi.kya` method names still work,
- verify return shapes remain stable for app consumers.

## Risks

### API drift

If the Anchor adapter leaks into the public API, SDK consumers will need to learn too much Solana detail.

Mitigation:
- keep Anchor details inside the adapter,
- keep `KyaClient` as the stable facade.

### Test fragility

Local validator tests can become flaky if setup is too heavy.

Mitigation:
- keep a thin unit-test layer for PDA/account mapping,
- use one or two end-to-end tests for the real flow.

### Migration mismatch

If the SDK and program account layouts drift, the client will break.

Mitigation:
- keep shared KYA types simple,
- update SDK mapping tests whenever the program state changes.

## Roadmap

### Phase 1
- add the Anchor adapter,
- wire `Hoshi.kya` to it,
- keep the API stable.

### Phase 2
- remove the in-memory registry from production paths,
- keep SDK validation against Anchor localnet.

### Phase 3
- expand metadata or attestation detail only if the product needs it.

## Decision Log

- Decision: KYA SDK wiring is program-backed only.
  Rationale: keeps production behavior aligned with the canonical onchain registry.

- Decision: the public SDK API stays stable.
  Rationale: minimizes churn for app developers.

- Decision: Anchor details stay behind a dedicated adapter.
  Rationale: preserves clean boundaries and testability.

- Decision: PDA derivation is based on normalized handles and owner keys.
  Rationale: prevents duplicate encodings and accidental namespace drift.
