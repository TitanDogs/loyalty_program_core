use crate::{
    errors::AlpinersError,
    structs::{Auth, Stats},
};
use anchor_lang::prelude::*;
use mpl_core::{
    accounts::{BaseAssetV1, BaseCollectionV1},
    fetch_plugin,
    instructions::UpdatePluginV1CpiBuilder,
    types::{Attribute, Attributes, Plugin, PluginType},
    ID as MPL_CORE_ID,
};

#[derive(Accounts)]
pub struct AttendeeConsume<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        seeds = [b"auth"],
        bump = auth.bump,
    )]
    pub auth: Box<Account<'info, Auth>>,
    #[account(mut)]
    pub asset: Account<'info, BaseAssetV1>,
    #[account(mut)]
    pub collection: Option<Account<'info, BaseCollectionV1>>,
    pub system_program: Program<'info, System>,
    #[account(address = MPL_CORE_ID)]
    /// CHECK: this account is checked by the address constraint
    pub mpl_core_program: UncheckedAccount<'info>,
}

impl<'info> AttendeeConsume<'info> {
    pub fn consume(&mut self, asset: &AccountInfo<'info>, amount: u16) -> Result<()> {
        let mut stats = Stats {
            experience: 0,
            level: 0,
            consumable: 0,
            consecutive_attendance: 0,
            referrals: 0,
            referrer: "None".to_string(),
        };

        let result =
            fetch_plugin::<BaseAssetV1, Attributes>(asset, PluginType::Attributes).unwrap();

        let attribute_list = result.1.attribute_list.clone();

        for attribute in attribute_list {
            if attribute.key == "experience" {
                stats.experience = attribute.value.parse::<u32>().unwrap();
            } else if attribute.key == "level" {
                stats.level = attribute.value.parse::<u16>().unwrap();
            } else if attribute.key == "consumable" {
                stats.consumable = attribute.value.parse::<u16>().unwrap();
            } else if attribute.key == "consecutive_attendance" {
                stats.consecutive_attendance = attribute.value.parse::<u16>().unwrap();
            } else if attribute.key == "referrals" {
                stats.referrals = attribute.value.parse::<u16>().unwrap();
            } else if attribute.key == "referrer" {
                stats.referrer = attribute.value.parse::<String>().unwrap();
            }
        }

        require!(
            stats.consumable >= amount,
            AlpinersError::NotEnoughConsumable
        );

        let new_consumable: u16 = stats.consumable - amount;

        let seeds = &[&b"auth"[..], &[self.auth.bump]];
        let signer_seeds = &[&seeds[..]];

        let attribute_list = vec![
            Attribute {
                key: "level".to_string(),
                value: stats.level.to_string(),
            },
            Attribute {
                key: "experience".to_string(),
                value: stats.experience.to_string(),
            },
            Attribute {
                key: "consumable".to_string(),
                value: new_consumable.to_string(),
            },
            Attribute {
                key: "consecutive_attendance".to_string(),
                value: stats.consecutive_attendance.to_string(),
            },
            Attribute {
                key: "referrals".to_string(),
                value: stats.referrals.to_string(),
            },
            Attribute {
                key: "referrer".to_string(),
                value: stats.referrer.to_string(),
            },
        ];

        let plugin = Plugin::Attributes(Attributes { attribute_list });

        let collection = match &self.collection {
            Some(collection) => Some(collection.to_account_info()),
            None => None,
        };

        UpdatePluginV1CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .asset(asset)
            .authority(Some(&self.auth.to_account_info()))
            .collection(collection.as_ref())
            .payer(&self.user.to_account_info())
            .system_program(&self.system_program.to_account_info())
            .plugin(plugin)
            .invoke_signed(signer_seeds)?;

        Ok(())
    }
}
