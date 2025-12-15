use anchor_lang::prelude::Pubkey;
use anchor_lang::prelude::*;
use mpl_core::{
    accounts::BaseAssetV1,
    instructions::{CreateCollectionV2CpiBuilder, CreateV2CpiBuilder},
    types::{
        AppDataInitInfo, Attribute, Attributes, ExternalPluginAdapterInitInfo,
        ExternalPluginAdapterSchema, FreezeDelegate, Plugin, PluginAuthority, PluginAuthorityPair,
    },
};

declare_id!("4bVjQitnjDxJQ72AWzpTpQvFcLwBpp1FZmwYqWCG6Tm8");

mod contexts;
use contexts::*;

mod structs;
use structs::*;

mod errors;
use errors::AlpinersError;

pub const ADMIN_WHITELIST: [&str; 1] = ["CHv326keHnnfBMvNFe1TB9dqNraUnUEBDmeCZJVqLhCi"];

#[program]
pub mod alpiners {
    use super::*;

    pub fn auth_init(ctx: Context<AuthInit>) -> Result<()> {
        msg!("Loyalty program auth initialized");

        let is_valid = ADMIN_WHITELIST.contains(
            &ctx.accounts
                .admin
                .to_account_info()
                .key()
                .to_string()
                .as_str(),
        );

        msg!(
            "Admin: {} is valid: {}",
            ctx.accounts.admin.to_account_info().key(),
            is_valid
        );

        let auth = &mut ctx.accounts.auth;
        auth.bump = ctx.bumps.auth;
        auth.count = 0;

        Ok(())
    }

    pub fn event_create(
        ctx: Context<EventCreate>,
        seed: u64,
        attendees_max: u64,
        previous_event: Option<Pubkey>,
        start_date: i64,
        end_date: i64,
    ) -> Result<()> {
        msg!("Event created");

        let event = &mut ctx.accounts.event;
        event.admin = ctx.accounts.admin.as_ref().key();
        event.attendees_max = attendees_max as u16;
        event.bump = ctx.bumps.event;
        event.seed = seed;
        event.start_date = start_date;
        event.end_date = end_date;

        let clock = Clock::get()?;
        event.creation_date = clock.unix_timestamp;

        if previous_event.is_some() {
            event.previous_event = previous_event;
        }

        Ok(())
    }

    pub fn collection_create(ctx: Context<CollectionCreate>) -> Result<()> {
        msg!("Collection created");

        let seeds = &[&b"auth"[..], &[ctx.accounts.auth.bump]];
        let signer_seeds = &[&seeds[..]];

        CreateCollectionV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
            .collection(&ctx.accounts.collection.to_account_info())
            .payer(&ctx.accounts.admin.to_account_info())
            .update_authority(Some(&ctx.accounts.auth.to_account_info()))
            .system_program(&ctx.accounts.system_program.to_account_info())
            .name("name".to_string())
            .uri("uri".to_string())
            .invoke_signed(signer_seeds)?;

        Ok(())
    }

    pub fn attendee_register(
        ctx: Context<AttendeeRegister>,
        referrer: Option<Pubkey>,
    ) -> Result<()> {
        msg!("Attendee registering");
        ctx.accounts.auth.count += 1;

        let collection = match &ctx.accounts.collection {
            Some(collection) => Some(collection.to_account_info()),
            None => None,
        };

        let seeds = &[&b"auth"[..], &[ctx.accounts.auth.bump]];
        let signer_seeds = &[&seeds[..]];

        let mut plugins: Vec<PluginAuthorityPair> = vec![];

        plugins.push(PluginAuthorityPair {
            plugin: Plugin::FreezeDelegate(FreezeDelegate { frozen: true }),
            authority: Some(PluginAuthority::UpdateAuthority),
        });

        let referrer_value = match referrer {
            Some(referrer) => referrer.to_string(),
            _ => "None".to_string(),
        };

        let attribute_list = vec![
            Attribute {
                key: "level".to_string(),
                value: "1".to_string(),
            },
            Attribute {
                key: "experience".to_string(),
                value: "0".to_string(),
            },
            Attribute {
                key: "consumable".to_string(),
                value: "0".to_string(),
            },
            Attribute {
                key: "consecutive_events".to_string(),
                value: "0".to_string(),
            },
            Attribute {
                key: "referrals".to_string(),
                value: "0".to_string(),
            },
            Attribute {
                key: "referrer".to_string(),
                value: referrer_value,
            },
        ];

        plugins.push(PluginAuthorityPair {
            plugin: Plugin::Attributes(Attributes {
                attribute_list: attribute_list,
            }),
            authority: Some(PluginAuthority::UpdateAuthority),
        });

        let mut external_plugin_adapters: Vec<ExternalPluginAdapterInitInfo> = vec![];

        external_plugin_adapters.push(ExternalPluginAdapterInitInfo::AppData(AppDataInitInfo {
            init_plugin_authority: Some(PluginAuthority::UpdateAuthority),
            data_authority: PluginAuthority::Address {
                address: ctx.accounts.auth.key(),
            },
            schema: Some(ExternalPluginAdapterSchema::Binary),
        }));

        let mut name: String = "Loyalty NFT #".to_string();
        name.push_str(&ctx.accounts.auth.count.to_string());

        CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
            .asset(&ctx.accounts.asset.to_account_info())
            .collection(collection.as_ref())
            .authority(Some(&ctx.accounts.auth.to_account_info()))
            .payer(&ctx.accounts.user.to_account_info())
            .owner(Some(&ctx.accounts.user.to_account_info()))
            .system_program(&ctx.accounts.system_program.to_account_info())
            .name(name)
            .uri("https://storage.sbg.cloud.ovh.net/v1/AUTH_b57b2acda20c461d98291b5245c8db82/super-storage/metadata.json".to_string())
            .plugins(plugins)
            .external_plugin_adapters(external_plugin_adapters)
            .invoke_signed(signer_seeds)?;

        Ok(())
    }

    pub fn attendee_check_in(
        ctx: Context<AttendeeCheckIn>,
        _seed: u64,
        _previous_seed: Option<u64>,
    ) -> Result<()> {
        msg!("Attendee checking in to event");
        let asset = ctx.accounts.asset.to_account_info();
        let owner = {
            let data = asset.try_borrow_data()?;
            let base_asset = BaseAssetV1::from_bytes(data.as_ref())?;
            base_asset.owner
        };

        require!(
            owner == ctx.accounts.user.key(),
            AlpinersError::AttendeeCheckedIn
        );

        let user = ctx.accounts.user.key();

        require!(
            (ctx.accounts.previous_event.is_none() && ctx.accounts.event.previous_event.is_none())
                || (ctx.accounts.previous_event.as_ref().unwrap().key()
                    == ctx.accounts.event.previous_event.unwrap()),
            AlpinersError::PreviousEventInvalid
        );

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;

        require!(
            current_timestamp > ctx.accounts.event.start_date,
            AlpinersError::EventNotStarted
        );
        require!(
            current_timestamp < ctx.accounts.event.end_date,
            AlpinersError::EventExpired
        );

        let is_attending = ctx
            .accounts
            .event
            .attendees
            .iter()
            .any(|attendee| attendee == &user);

        require!(!is_attending, AlpinersError::AttendeeCheckedIn);

        let is_full =
            ctx.accounts.event.attendees.len() >= ctx.accounts.event.attendees_max as usize;
        require!(!is_full, AlpinersError::EventFull);

        if !is_attending {
            ctx.accounts.event.attendees.push(user);

            let current_stats = ctx
                .accounts
                .get_stats(&ctx.accounts.asset.to_account_info())
                .unwrap();

            let new_stats = ctx.accounts.generate_stats(current_stats, 200).unwrap();
            let _ = ctx
                .accounts
                .set_stats(&ctx.accounts.asset.to_account_info(), new_stats);
        }

        if ctx.accounts.referrer_asset.is_some() {
            let referrer_stats = ctx
                .accounts
                .get_stats(
                    &ctx.accounts
                        .referrer_asset
                        .clone()
                        .unwrap()
                        .to_account_info(),
                )
                .unwrap();

            let new_referrer_stats = ctx
                .accounts
                .generate_referrer_stats(referrer_stats)
                .unwrap();

            let _ = ctx.accounts.set_stats(
                &ctx.accounts
                    .referrer_asset
                    .clone()
                    .unwrap()
                    .to_account_info(),
                new_referrer_stats,
            );
        }
        Ok(())
    }

    pub fn attendee_consume(ctx: Context<AttendeeConsume>, amount: u16) -> Result<()> {
        ctx.accounts
            .consume(&ctx.accounts.asset.to_account_info(), amount)
            .unwrap();

        Ok(())
    }
}
