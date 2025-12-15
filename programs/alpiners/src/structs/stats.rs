use anchor_lang::prelude::Pubkey;

pub struct Stats {
    pub level: u16,
    pub experience: u32,
    pub consumable: u16,
    pub consecutive_attendance: u16,
    pub referrals: u16,
    pub referrer: String,
}

impl Stats {
    pub const LEN: usize = 2 //u16
    + 4 //u32
    + 2 //u16
    + 2 //u16
    + 2 //u16
    + 32 //pubkey string
    ;
}
