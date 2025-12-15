use crate::{structs::Auth, ADMIN_WHITELIST};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AuthInit<'info> {
    #[account(mut, constraint = ADMIN_WHITELIST.contains(&admin
            .to_account_info()
            .key()
            .to_string()
            .as_str()))]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        seeds = [b"auth"],
        bump,
        space = Auth::LEN,
    )]
    pub auth: Box<Account<'info, Auth>>,
    pub system_program: Program<'info, System>,
}
