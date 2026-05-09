use anchor_lang::prelude::*;

pub const MAX_HANDLE_LEN: usize = 64;
pub const MAX_DISPLAY_NAME_LEN: usize = 64;
pub const MAX_METADATA_URI_LEN: usize = 200;

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

impl IdentityAccount {
    pub const LEN: usize = 4
        + MAX_HANDLE_LEN
        + 32
        + 4
        + MAX_DISPLAY_NAME_LEN
        + 1
        + 4
        + MAX_METADATA_URI_LEN
        + 8
        + 8
        + 8
        + 8
        + 1;
}

#[account]
pub struct WalletIndex {
    pub owner: Pubkey,
    pub handle: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl WalletIndex {
    pub const LEN: usize = 32 + 4 + MAX_HANDLE_LEN + 8 + 8 + 1;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_lengths_compile() {
        assert_eq!(RegistryConfig::LEN, 65);
        assert!(IdentityAccount::LEN > RegistryConfig::LEN);
        assert!(WalletIndex::LEN > 0);
    }
}
