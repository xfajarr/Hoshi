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
