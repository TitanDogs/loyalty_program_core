use crate::structs::Auth;
use anchor_lang::prelude::*;
use mpl_core::{accounts::BaseCollectionV1, ID as MPL_CORE_ID};

#[derive(Accounts)]
pub struct AttendeeRegister<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        seeds = [b"auth"],
        bump = auth.bump,
    )]
    pub auth: Box<Account<'info, Auth>>,
    #[account(mut)]
    pub asset: Signer<'info>,
    #[account(mut)]
    pub collection: Option<Account<'info, BaseCollectionV1>>,
    pub system_program: Program<'info, System>,
    #[account(address = MPL_CORE_ID)]
    /// CHECK: this account is checked by the address constraint
    pub mpl_core_program: UncheckedAccount<'info>,
}
