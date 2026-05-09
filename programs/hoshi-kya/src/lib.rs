use anchor_lang::prelude::*;

declare_id!("7QaaaMxxPavk8KRZwS5WwbPzPmRkXPtjFmfxh2M8ev1Z");

pub mod errors;
pub mod state;

pub use errors::KyaError;
pub use state::{IdentityAccount, RegistryConfig, WalletIndex};

#[program]
pub mod hoshi_kya {
    use super::*;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>, hoshi_issuer: Pubkey) -> Result<()> {
        let registry_config = &mut ctx.accounts.registry_config;
        registry_config.authority = ctx.accounts.authority.key();
        registry_config.hoshi_issuer = hoshi_issuer;
        registry_config.bump = ctx.bumps.registry_config;
        Ok(())
    }

    pub fn claim_handle(
        ctx: Context<ClaimHandle>,
        handle: String,
        display_name: String,
        metadata_uri: Option<String>,
    ) -> Result<()> {
        require!(handle.ends_with(".hoshi"), KyaError::InvalidHandle);

        let now = Clock::get()?.unix_timestamp;

        let identity = &mut ctx.accounts.identity;
        identity.handle = handle.clone();
        identity.owner = ctx.accounts.owner.key();
        identity.display_name = display_name;
        identity.metadata_uri = metadata_uri;
        identity.reputation_score = 0;
        identity.attestation_count = 0;
        identity.created_at = now;
        identity.updated_at = now;
        identity.bump = ctx.bumps.identity;

        let wallet_index = &mut ctx.accounts.wallet_index;
        wallet_index.owner = ctx.accounts.owner.key();
        wallet_index.handle = handle;
        wallet_index.created_at = now;
        wallet_index.updated_at = now;
        wallet_index.bump = ctx.bumps.wallet_index;

        Ok(())
    }

    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        handle: String,
        delta: i64,
        _reason: String,
        _reference: Option<String>,
    ) -> Result<()> {
        require!(
            ctx.accounts.hoshi_signer.key() == ctx.accounts.registry_config.hoshi_issuer,
            KyaError::UnauthorizedIssuer
        );
        require!(ctx.accounts.identity.handle == handle, KyaError::InvalidHandle);

        let now = Clock::get()?.unix_timestamp;
        let identity = &mut ctx.accounts.identity;
        identity.reputation_score = identity.reputation_score.checked_add(delta).unwrap();
        identity.attestation_count = identity.attestation_count.checked_add(1).unwrap();
        identity.updated_at = now;

        Ok(())
    }

    pub fn resolve_handle(ctx: Context<ResolveHandle>) -> Result<()> {
        let _ = &ctx.accounts.identity;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + RegistryConfig::LEN,
        seeds = [b"registry"],
        bump
    )]
    pub registry_config: Account<'info, RegistryConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(handle: String)]
pub struct ClaimHandle<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + IdentityAccount::LEN,
        seeds = [b"identity", handle.as_bytes()],
        bump
    )]
    pub identity: Account<'info, IdentityAccount>,
    #[account(
        init,
        payer = owner,
        space = 8 + WalletIndex::LEN,
        seeds = [b"wallet", owner.key().as_ref()],
        bump
    )]
    pub wallet_index: Account<'info, WalletIndex>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(handle: String)]
pub struct UpdateReputation<'info> {
    pub registry_config: Account<'info, RegistryConfig>,
    pub hoshi_signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"identity", handle.as_bytes()],
        bump = identity.bump,
    )]
    pub identity: Account<'info, IdentityAccount>,
}

#[derive(Accounts)]
pub struct ResolveHandle<'info> {
    pub identity: Account<'info, IdentityAccount>,
}
