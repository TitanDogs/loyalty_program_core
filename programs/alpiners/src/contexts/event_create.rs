use crate::{structs::Event, ADMIN_WHITELIST};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(seed: u64, attendees_max: u64)]
pub struct EventCreate<'info> {
    #[account(mut, constraint = ADMIN_WHITELIST.contains(&admin
            .to_account_info()
            .key()
            .to_string()
            .as_str()))]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        seeds = [b"event", seed.to_le_bytes().as_ref()],
        bump,
        space = Event::LEN + (attendees_max as usize) * 32,
    )]
    pub event: Box<Account<'info, Event>>,
    pub system_program: Program<'info, System>,
}
