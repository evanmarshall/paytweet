use anchor_lang::prelude::*;
use std::mem::size_of;

declare_id!("ATqV2MQZsDvB9Z2R9DfxBb1Lmi82oiymhHESV7jpeVkG");

#[program]
pub mod paytweet {
    use super::*;

    pub fn create(
        ctx: Context<Create>,
        vault_bump: u8,
        uuid: u64,
        amount: u64,
        twitter_id: u64,
        matching_text: [u8; 256],
    ) -> ProgramResult {
        // Set Vault Info
        { 
            let clock: Clock = Clock::get().unwrap();
            let vault = &mut ctx.accounts.vault;

            vault.initiator = ctx.accounts.initiator.key();
            vault.oracle = ctx.accounts.oracle.key();
            vault.amount = amount;
            vault.twitter_id = twitter_id;
            vault.matching_text = matching_text;
            vault.created_at = clock.unix_timestamp;
            vault.uuid = uuid;
            vault.bump = vault_bump;
        }

        // Transfer sol from Initiator to Vault PDA
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.initiator.key(),
            &ctx.accounts.vault.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.initiator.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn publish_tweet(
        ctx: Context<PublishTweet>,
        tweet_id: u64,
    ) -> ProgramResult {
        {
            let oracle_key = ctx.accounts.oracle.key();
            let vault = &mut ctx.accounts.vault;

            msg!("Vault key {}", vault.key().to_string());
            msg!("Vault lamports {}", vault.to_account_info().lamports());

            if oracle_key != vault.oracle {
                return Err(ErrorCode::Unauthorized.into());
            }

            if tweet_id != vault.twitter_id {
                return Err(ErrorCode::WrongTweet.into());
            }
        }
        // Transfer the lamports
        {
            let vault = &mut ctx.accounts.vault;

            **ctx.accounts.recipient.try_borrow_mut_lamports()? += vault.to_account_info().lamports();
            **vault.to_account_info().try_borrow_mut_lamports()? = 0;
        }

        Ok(())
    }

    pub fn cancel(
        ctx: Context<Cancel>,
        tweet_id: u64,
    ) -> ProgramResult {
        {
            let initiator_key = ctx.accounts.initiator.key();
            let vault = &mut ctx.accounts.vault;

            if initiator_key != vault.initiator {
                return Err(ErrorCode::Unauthorized.into());
            }

            if tweet_id != vault.twitter_id {
                return Err(ErrorCode::WrongTweet.into());
            }
        }

        // Transfer the lamports
        {
            let vault = &mut ctx.accounts.vault;

            **ctx.accounts.initiator.try_borrow_mut_lamports()? += vault.to_account_info().lamports();
            **vault.to_account_info().try_borrow_mut_lamports()? = 0;
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(vault_bump: u8, uuid: u64)]
pub struct Create<'info> {
    #[account(mut, signer)]
    pub initiator: AccountInfo<'info>,
    #[account(
        init, 
        seeds = [b"vault-seed".as_ref(), initiator.key().as_ref(), uuid.to_string().as_bytes()],
        bump = vault_bump,
        payer = initiator,
        space = 8 + size_of::<Vault>()
    )]
    pub vault: Account<'info, Vault>,
    pub oracle: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishTweet<'info> {
    #[account(mut, signer)]
    pub oracle: AccountInfo<'info>,
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut, signer)]
    pub initiator: AccountInfo<'info>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub initiator: Pubkey,
    pub oracle: Pubkey,
    pub amount: u64,
    pub twitter_id: u64,
    pub matching_text: [u8; 256],
    pub created_at: i64,
    pub bump: u8,
    pub uuid: u64,
}

#[error]
pub enum ErrorCode {
    #[msg("You are not authorized to complete this transaction")]
    Unauthorized,
    #[msg("You provided the incorrect tweet id")]
    WrongTweet,
}