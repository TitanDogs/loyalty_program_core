use crate::{structs::Auth, ADMIN_WHITELIST};
use anchor_lang::prelude::*;
use mpl_core::ID as MPL_CORE_ID;

#[derive(Accounts)]
pub struct CollectionCreate<'info> {
    #[account(mut, constraint = ADMIN_WHITELIST.contains(&admin
            .to_account_info()
            .key()
            .to_string()
            .as_str()))]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub collection: Signer<'info>,
    #[account(
        seeds = [b"auth"],
        bump = auth.bump,
    )]
    pub auth: Box<Account<'info, Auth>>,
    pub system_program: Program<'info, System>,
    #[account(address = MPL_CORE_ID)]
    /// CHECK: this account is checked by the address constraint
    pub mpl_core_program: UncheckedAccount<'info>,
}
