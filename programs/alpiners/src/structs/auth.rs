use anchor_lang::prelude::*;

#[account]
pub struct Auth {
    pub bump: u8,
    pub count: u32,
}

impl Auth {
    pub const LEN: usize = 8 //Discriminator
    + 1 //u8
    + 4 //u32
    ;
}
