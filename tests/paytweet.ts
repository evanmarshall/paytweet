import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Paytweet } from '../target/types/paytweet';
import { assert } from "chai";

describe('paytweet', () => {
    const ENV = 'http://localhost:8899';

    function createProvider(keyPair) {
        let solConnection = new anchor.web3.Connection(ENV);
        let walletWrapper = new anchor.Wallet(keyPair);
        return new anchor.Provider(solConnection, walletWrapper, {
            preflightCommitment: 'recent',
        });
    }

    async function getBalance(prov, key) {
        anchor.setProvider(prov);
        return await prov.connection.getBalance(key, "confirmed");
    }

    const initiatorKeyPair = anchor.web3.Keypair.generate();
    const recipientKeyPair = anchor.web3.Keypair.generate();
    const oracle = anchor.web3.Keypair.generate();

    let provider = createProvider(initiatorKeyPair);
    let oracleProvider = createProvider(oracle);

    const program = anchor.workspace.Paytweet as Program<Paytweet>;
    const initiatorProgram = new anchor.Program(program.idl, program.programId, provider);
    const oracleProgram = new anchor.Program(program.idl, program.programId, oracleProvider);

    const oraclePubkey = oracle.publicKey;
    const amount = new anchor.BN(690000000);
    const airdropAmount = 420000000000; // Should be more than amount
    const twitterId = new anchor.BN(474429261); // @coralrelief
    const matchingText = '@DemoxLabs';
    let uuidNumber = Math.floor(Math.random() * 2**50);
    let uuid = Buffer.from(String(uuidNumber));
    let vaultAccount, vaultBump;

    anchor.setProvider(provider);

    it('Set up tests', async () => {
        console.log('Initiator Pubkey: ', initiatorKeyPair.publicKey.toString());
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(initiatorKeyPair.publicKey, airdropAmount),
            "confirmed"
        );

        console.log('Recipient Pubkey: ', recipientKeyPair.publicKey.toString());
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(recipientKeyPair.publicKey, airdropAmount),
            "confirmed"
        );

        console.log('Oracle Pubkey', oracle.publicKey.toString());
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(oracle.publicKey, airdropAmount),
            "confirmed"
        );
    });

    it('Create Paid Tweet!', async () => {
        [vaultAccount, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from("vault-seed"), initiatorKeyPair.publicKey.toBuffer(), uuid],
            program.programId
            );
        console.log('Vault account: ', vaultAccount.toString());

        let buff = Buffer.alloc(256);
        buff.fill(matchingText);
        await provider.connection.confirmTransaction(
            await program.rpc.create(
                vaultBump,
                new anchor.BN(uuidNumber),
                amount,
                twitterId,
                buff,
                {
                    accounts: {
                        initiator: initiatorKeyPair.publicKey,
                        vault: vaultAccount,
                        oracle: oraclePubkey,
                        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                    signers: [initiatorKeyPair],
                }
            ),
            "confirmed"
        );

        let initiatorBalance = await getBalance(provider, initiatorKeyPair.publicKey);
        let vaultBalance = await getBalance(provider, vaultAccount);

        console.log('initiator Balance: ', initiatorBalance);
        console.log('vault Balance: ', vaultBalance);

        assert(initiatorBalance < airdropAmount - amount.toNumber());
        assert(vaultBalance >= amount.toNumber());
    });

    it('Payout the tweeter', async () => {
        anchor.setProvider(oracleProvider);
        await oracleProgram.rpc.publishTweet(
            twitterId,
            {
                accounts: {
                    oracle: oraclePubkey,
                    recipient: recipientKeyPair.publicKey,
                    vault: vaultAccount,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [oracle],
            },
        );
        
        let initiatorBalance = await getBalance(provider, initiatorKeyPair.publicKey);
        let recipientBalance = await getBalance(provider, recipientKeyPair.publicKey);
        let vaultBalance = await getBalance(provider, vaultAccount);

        console.log('initiator Balance: ', initiatorBalance);
        console.log('Recipient Balance: ', recipientBalance);
        console.log('vault Balance: ', vaultBalance);

        assert(initiatorBalance < airdropAmount - amount.toNumber());
        assert(recipientBalance = airdropAmount + amount.toNumber() - 2 * 5000); // account for transaction cost
        assert(vaultBalance == 0);
    });

    it('Can create second vault', async () => {
        uuidNumber = Math.floor(Math.random() * 2**50);
        uuid = Buffer.from(String(uuidNumber));

        [vaultAccount, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from("vault-seed"), initiatorKeyPair.publicKey.toBuffer(), uuid],
            program.programId
            );
        console.log('Vault account: ', vaultAccount.toString());

        let buff = Buffer.alloc(256);
        buff.fill(matchingText);
        await provider.connection.confirmTransaction(
            await program.rpc.create(
                vaultBump,
                new anchor.BN(uuidNumber),
                amount,
                twitterId,
                buff,
                {
                    accounts: {
                        initiator: initiatorKeyPair.publicKey,
                        vault: vaultAccount,
                        oracle: oraclePubkey,
                        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                    signers: [initiatorKeyPair],
                }
            ),
            "confirmed"
        );

        let initiatorBalance = await getBalance(provider, initiatorKeyPair.publicKey);
        let vaultBalance = await getBalance(provider, vaultAccount);

        console.log('initiator Balance: ', initiatorBalance);
        console.log('vault Balance: ', vaultBalance);

        assert(initiatorBalance < airdropAmount - amount.toNumber());
        assert(vaultBalance >= amount.toNumber());
    });
    
    it('Can create second vault', async () => {
        let startInitiatorBalance = await getBalance(provider, initiatorKeyPair.publicKey);

        await provider.connection.confirmTransaction(
            await program.rpc.cancel(
                twitterId,
                {
                    accounts: {
                        initiator: initiatorKeyPair.publicKey,
                        vault: vaultAccount,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                    signers: [initiatorKeyPair],
                }
            ),
            "confirmed"
        );

        let initiatorBalance = await getBalance(provider, initiatorKeyPair.publicKey);
        let vaultBalance = await getBalance(provider, vaultAccount);

        console.log('initiator Balance: ', initiatorBalance);
        console.log('vault Balance: ', vaultBalance);

        assert((initiatorBalance - startInitiatorBalance) > amount.toNumber());
        assert(vaultBalance == 0);
    });
});
