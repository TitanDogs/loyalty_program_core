use anchor_lang::prelude::*;

#[account]
pub struct Event {
    pub admin: Pubkey,
    pub seed: u64,
    pub bump: u8,
    pub attendees: Vec<Pubkey>,
    pub attendees_max: u16,
    pub previous_event: Option<Pubkey>,
    pub creation_date: i64,
    pub start_date: i64,
    pub end_date: i64,
}

impl Event {
    pub const LEN: usize = 8 //Discriminator
    + 32 //Pubkey
    + 8 //u64
    + 1 //u8
    + 8 //Vec
    + 2 //u16
    + 32 //Pubkey
    + 8 //i64
    + 8 //i64
    + 8 //i64
    ;
}
