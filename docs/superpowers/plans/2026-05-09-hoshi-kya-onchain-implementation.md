# Hoshi KYA Onchain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Hoshi KYA Anchor program as the onchain source of truth for `.hoshi` handles, ownership, and direct reputation deltas.

**Architecture:** Build a minimal Anchor registry with three core paths: initialize config, claim identity, and update reputation. Keep the account model compact by splitting identity ownership from wallet indexing, and keep the SDK-facing API thin so the existing `hoshi-sdk` client can swap to the program later without a rewrite.

**Tech Stack:** Anchor, Rust, Solana program tests, TypeScript integration tests, existing `@hoshi/sdk` workspace.

---

### Task 1: Scaffold the Anchor workspace and program skeleton

**Files:**
- Create: `Anchor.toml`
- Create: `programs/hoshi-kya/Cargo.toml`
- Create: `programs/hoshi-kya/src/lib.rs`
- Create: `programs/hoshi-kya/src/state.rs`
- Create: `programs/hoshi-kya/src/errors.rs`
- Create: `tests/hoshi-kya.ts`
- Modify: `package.json:1-30`

- [ ] **Step 1: Write the failing test or scaffold check**

```bash
[ -f Anchor.toml ] && [ -f programs/hoshi-kya/src/lib.rs ] && echo "scaffold exists" || exit 1
```

Run: `bash -lc '[ -f Anchor.toml ] && [ -f programs/hoshi-kya/src/lib.rs ] && echo scaffold exists || exit 1'`
Expected: FAIL because the Anchor workspace does not exist yet.

- [ ] **Step 2: Write minimal scaffold files**

```toml
[workspace]
members = ["programs/hoshi-kya"]
resolver = "2"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"
```

```toml
[package]
name = "hoshi-kya"
version = "0.1.0"
description = "Hoshi KYA onchain registry"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "hoshi_kya"

[dependencies]
anchor-lang = "0.30.1"
```

```rust
use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

pub mod errors;
pub mod state;

#[program]
pub mod hoshi_kya {
    use super::*;

    pub fn initialize_registry(_ctx: Context<InitializeRegistry>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRegistry {}
```

- [ ] **Step 3: Run scaffold check again**

Run: `bash -lc '[ -f Anchor.toml ] && [ -f programs/hoshi-kya/src/lib.rs ] && echo scaffold exists'`
Expected: PASS with `scaffold exists`.

- [ ] **Step 4: Commit**

```bash
git add Anchor.toml programs/hoshi-kya/Cargo.toml programs/hoshi-kya/src/lib.rs programs/hoshi-kya/src/state.rs programs/hoshi-kya/src/errors.rs tests/hoshi-kya.ts package.json
git commit -m "feat: scaffold Hoshi KYA Anchor program"
```

### Task 2: Add registry, identity, and wallet index state

**Files:**
- Modify: `programs/hoshi-kya/src/state.rs`
- Modify: `programs/hoshi-kya/src/errors.rs`
- Modify: `programs/hoshi-kya/src/lib.rs`
- Test: `tests/hoshi-kya.ts`

- [ ] **Step 1: Write the failing program test**

```ts
import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { expect } from 'chai'

describe('hoshi-kya', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = anchor.workspace.HoshiKya as Program

  it('initializes the registry config', async () => {
    const tx = await program.methods.initializeRegistry().accounts({}).rpc()
    expect(tx).to.be.a('string')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `anchor test`
Expected: FAIL because the program accounts and instructions are not implemented yet.

- [ ] **Step 3: Write minimal state definitions**

```rust
use anchor_lang::prelude::*;

#[account]
pub struct RegistryConfig {
    pub authority: Pubkey,
    pub hoshi_issuer: Pubkey,
    pub bump: u8,
}

impl RegistryConfig {
    pub const LEN: usize = 32 + 32 + 1;
}

#[account]
pub struct IdentityAccount {
    pub handle: String,
    pub owner: Pubkey,
    pub display_name: String,
    pub metadata_uri: Option<String>,
    pub reputation_score: i64,
    pub attestation_count: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct WalletIndex {
    pub owner: Pubkey,
    pub handle: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}
```

```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum KyaError {
    #[msg("Handle already exists")]
    HandleTaken,
    #[msg("Wallet already owns a Hoshi handle")]
    WalletAlreadyHasHandle,
    #[msg("Invalid Hoshi handle")]
    InvalidHandle,
    #[msg("Unauthorized issuer")]
    UnauthorizedIssuer,
}
```

- [ ] **Step 4: Run test until state compiles**

Run: `anchor test`
Expected: program compiles past state/error definitions and still fails on missing instruction logic.

- [ ] **Step 5: Commit**

```bash
git add programs/hoshi-kya/src/state.rs programs/hoshi-kya/src/errors.rs programs/hoshi-kya/src/lib.rs tests/hoshi-kya.ts
git commit -m "feat: add Hoshi KYA registry state"
```

### Task 3: Implement open claim with one-handle-per-wallet enforcement

**Files:**
- Modify: `programs/hoshi-kya/src/lib.rs`
- Modify: `programs/hoshi-kya/src/state.rs`
- Modify: `tests/hoshi-kya.ts`

- [ ] **Step 1: Write the failing claim test**

```ts
it('allows a wallet to claim one .hoshi handle and rejects a second claim', async () => {
  const wallet = anchor.web3.Keypair.generate()
  const sig = await provider.connection.requestAirdrop(wallet.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
  await provider.connection.confirmTransaction(sig)

  const handle = 'namaagent.hoshi'
  const tx1 = await program.methods
    .claimHandle(handle, 'Nama Agent', null)
    .accounts({ owner: wallet.publicKey })
    .signers([wallet])
    .rpc()

  expect(tx1).to.be.a('string')

  await expect(
    program.methods
      .claimHandle('anotheragent.hoshi', 'Another Agent', null)
      .accounts({ owner: wallet.publicKey })
      .signers([wallet])
      .rpc()
  ).to.be.rejected
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `anchor test`
Expected: FAIL because `claim_handle` is not yet implemented.

- [ ] **Step 3: Implement minimal claim instruction**

```rust
#[program]
pub mod hoshi_kya {
    use super::*;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>, hoshi_issuer: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.registry_config;
        config.authority = ctx.accounts.payer.key();
        config.hoshi_issuer = hoshi_issuer;
        config.bump = ctx.bumps.registry_config;
        Ok(())
    }

    pub fn claim_handle(
        ctx: Context<ClaimHandle>,
        handle: String,
        display_name: String,
        metadata_uri: Option<String>,
    ) -> Result<()> {
        require!(handle.ends_with(".hoshi"), KyaError::InvalidHandle);
        require!(ctx.accounts.wallet_index.handle.is_empty(), KyaError::WalletAlreadyHasHandle);

        let identity = &mut ctx.accounts.identity;
        identity.handle = handle.clone();
        identity.owner = ctx.accounts.owner.key();
        identity.display_name = display_name;
        identity.metadata_uri = metadata_uri;
        identity.reputation_score = 0;
        identity.attestation_count = 0;
        identity.created_at = Clock::get()?.unix_timestamp;
        identity.updated_at = identity.created_at;
        identity.bump = ctx.bumps.identity;

        let wallet_index = &mut ctx.accounts.wallet_index;
        wallet_index.owner = ctx.accounts.owner.key();
        wallet_index.handle = handle;
        wallet_index.created_at = identity.created_at;
        wallet_index.updated_at = identity.updated_at;
        wallet_index.bump = ctx.bumps.wallet_index;

        Ok(())
    }
}
```

```rust
#[derive(Accounts)]
#[instruction(handle: String)]
pub struct ClaimHandle<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + 512,
        seeds = [b"identity", handle.as_bytes()],
        bump
    )]
    pub identity: Account<'info, IdentityAccount>,
    #[account(
        init,
        payer = owner,
        space = 8 + 128,
        seeds = [b"wallet", owner.key().as_ref()],
        bump
    )]
    pub wallet_index: Account<'info, WalletIndex>,
    pub system_program: Program<'info, System>,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `anchor test`
Expected: PASS for open-claim and one-handle-per-wallet behavior.

- [ ] **Step 5: Commit**

```bash
git add programs/hoshi-kya/src/lib.rs programs/hoshi-kya/src/state.rs tests/hoshi-kya.ts
git commit -m "feat: add open claim registry checks"
```

### Task 4: Implement direct reputation deltas for Hoshi-issued attestations

**Files:**
- Modify: `programs/hoshi-kya/src/lib.rs`
- Modify: `programs/hoshi-kya/src/state.rs`
- Modify: `programs/hoshi-kya/src/errors.rs`
- Modify: `tests/hoshi-kya.ts`

- [ ] **Step 1: Write the failing reputation test**

```ts
it('applies direct reputation deltas only from Hoshi authority', async () => {
  const delta = new anchor.BN(5)
  await program.methods
    .updateReputation('namaagent.hoshi', delta, 'payment.completed', null)
    .accounts({})
    .rpc()

  const identity = await program.account.identityAccount.fetch(identityPda)
  expect(identity.reputationScore.toNumber()).to.equal(5)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `anchor test`
Expected: FAIL because `update_reputation` and issuer gating are not implemented yet.

- [ ] **Step 3: Implement the minimal delta update**

```rust
pub fn update_reputation(
    ctx: Context<UpdateReputation>,
    handle: String,
    delta: i64,
    _reason: String,
    _reference: Option<String>,
) -> Result<()> {
    require!(ctx.accounts.hoshi_signer.key() == ctx.accounts.registry_config.hoshi_issuer, KyaError::UnauthorizedIssuer);

    let identity = &mut ctx.accounts.identity;
    require!(identity.handle == handle, KyaError::InvalidHandle);

    identity.reputation_score = identity.reputation_score.checked_add(delta).unwrap();
    identity.attestation_count = identity.attestation_count.checked_add(1).unwrap();
    identity.updated_at = Clock::get()?.unix_timestamp;

    Ok(())
}
```

```rust
#[derive(Accounts)]
#[instruction(handle: String)]
pub struct UpdateReputation<'info> {
    #[account(mut)]
    pub registry_config: Account<'info, RegistryConfig>,
    pub hoshi_signer: Signer<'info>,
    #[account(mut, seeds = [b"identity", handle.as_bytes()], bump = identity.bump)]
    pub identity: Account<'info, IdentityAccount>,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `anchor test`
Expected: PASS for Hoshi-gated reputation deltas.

- [ ] **Step 5: Commit**

```bash
git add programs/hoshi-kya/src/lib.rs programs/hoshi-kya/src/state.rs programs/hoshi-kya/src/errors.rs tests/hoshi-kya.ts
git commit -m "feat: add Hoshi reputation delta updates"
```

### Task 5: Add resolve path and SDK-facing account shape checks

**Files:**
- Modify: `programs/hoshi-kya/src/lib.rs`
- Modify: `tests/hoshi-kya.ts`
- Modify: `packages/hoshi-sdk/src/kya/client.ts` later if needed for program wiring

- [ ] **Step 1: Write the failing resolve test**

```ts
it('resolves the onchain profile shape', async () => {
  const account = await program.account.identityAccount.fetch(identityPda)
  expect(account.handle).to.equal('namaagent.hoshi')
  expect(account.displayName).to.equal('Nama Agent')
})
```

- [ ] **Step 2: Run test to verify it fails if shape is incomplete**

Run: `anchor test`
Expected: FAIL if any identity fields are missing or not serialized as expected.

- [ ] **Step 3: Finalize the read-facing account model**

```rust
pub fn resolve_handle(ctx: Context<ResolveHandle>) -> Result<()> {
    let _ = &ctx.accounts.identity;
    Ok(())
}
```

```rust
#[derive(Accounts)]
pub struct ResolveHandle<'info> {
    pub identity: Account<'info, IdentityAccount>,
}
```

- [ ] **Step 4: Run full program tests**

Run: `anchor test`
Expected: PASS for claim, reputation, and resolve checks.

- [ ] **Step 5: Commit**

```bash
git add programs/hoshi-kya/src/lib.rs tests/hoshi-kya.ts
git commit -m "feat: add KYA resolve path"
```

### Deferred follow-up: SDK program wiring

Once the Anchor program is stable, add a follow-up plan to replace the in-memory KYA registry client in `packages/hoshi-sdk/src/kya/*` with a program-backed client using the generated Anchor IDL and accounts.
