/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from "dotenv";
dotenv.config();

import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { createAccountInfo, checkAccountInitialized } from "./utils";
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID, Account } from "@solana/spl-token";
import { TokenSaleAccountLayoutInterface, TokenSaleAccountLayout } from "./account";
import BN = require("bn.js");
import bs58 = require("bs58");

type InstructionNumber = 0 | 1 | 2 | 3;

const transaction = async () => {
  console.log("3. Buy Tokens");
  //phase1 (setup Transaction & send Transaction)
  console.log("Setup Buy Transaction");
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const tokenSaleProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID!);
  const sellerPubkey = new PublicKey(process.env.SELLER_PUBLIC_KEY!);
  const buyerPubkey = new PublicKey(process.env.BUYER_PUBLIC_KEY!);
  const secretKey = bs58.decode(process.env.BUYER_PRIVATE_KEY!);
  const buyerPrivateKey = Uint8Array.from(Buffer.from(secretKey));
  const buyerKeypair = new Keypair({
    publicKey: buyerPubkey.toBytes(),
    secretKey: buyerPrivateKey,
  });

  const number_of_tokens = 10;

  const tokenPubkey = new PublicKey(process.env.TOKEN_PUBKEY!);
  const tokenSaleProgramAccountPubkey = new PublicKey(process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY!);
  const sellerTokenAccountPubkey = new PublicKey(process.env.SELLER_TOKEN_ACCOUNT_PUBKEY!);
  const tempTokenAccountPubkey = new PublicKey(process.env.TEMP_TOKEN_ACCOUNT_PUBKEY!);
  const instruction: InstructionNumber = 1;

  const tokenSaleProgramAccount = await checkAccountInitialized(connection, tokenSaleProgramAccountPubkey);
  const encodedTokenSaleProgramAccountData = tokenSaleProgramAccount.data;
  const decodedTokenSaleProgramAccountData = TokenSaleAccountLayout.decode(
    encodedTokenSaleProgramAccountData
  ) as TokenSaleAccountLayoutInterface;

  // Add debug logging to see the raw data
  console.log("Raw decoded data:", {
    sellerPubkey: decodedTokenSaleProgramAccountData.sellerPubkey,
    tempTokenAccountPubkey: decodedTokenSaleProgramAccountData.tempTokenAccountPubkey,
  });

  // Helper function to safely convert Uint8Array to PublicKey
  const toPublicKey = (data: Uint8Array): PublicKey => {
    // Ensure the data is exactly 32 bytes
    if (data.length !== 32) {
      throw new Error(`Invalid public key data length: ${data.length}`);
    }
    return new PublicKey(Array.from(data));
  };

  try {
    const tokenSaleProgramAccountData = {
      isInitialized: decodedTokenSaleProgramAccountData.isInitialized,
      sellerPubkey: toPublicKey(decodedTokenSaleProgramAccountData.sellerPubkey),
      tempTokenAccountPubkey: toPublicKey(decodedTokenSaleProgramAccountData.tempTokenAccountPubkey),
      swapSolAmount: decodedTokenSaleProgramAccountData.swapSolAmount,
      swapTokenAmount: decodedTokenSaleProgramAccountData.swapTokenAmount,
    };

    console.log("Converted account data:", {
      isInitialized: tokenSaleProgramAccountData.isInitialized,
      sellerPubkey: tokenSaleProgramAccountData.sellerPubkey.toBase58(),
      tempTokenAccountPubkey: tokenSaleProgramAccountData.tempTokenAccountPubkey.toBase58(),
      swapSolAmount: tokenSaleProgramAccountData.swapSolAmount,
      swapTokenAmount: tokenSaleProgramAccountData.swapTokenAmount,
    });

    console.log("getOrCreateAssociatedTokenAccount");
    let buyerTokenAccount = await getOrCreateAssociatedTokenAccount(connection, buyerKeypair, tokenPubkey, buyerKeypair.publicKey, undefined, undefined, undefined, TOKEN_PROGRAM_ID)
      .catch(e => console.log("error: "+e));
    const PDA = await PublicKey.findProgramAddressSync([Buffer.from("token_sale")], tokenSaleProgramId);

    buyerTokenAccount = buyerTokenAccount as Account

    console.log("Send to buyer: "+ buyerTokenAccount.address)
    console.log("Token Pubkey: "+ tokenPubkey)

    console.log({
      tokenSaleProgramId: tokenSaleProgramId,
        tokenSaleProgramAccountPubkey: tokenSaleProgramAccountPubkey,
        buyerPubKey: buyerKeypair.publicKey,
        sellerKeypair: tokenSaleProgramAccountData.sellerPubkey,
        tempTokenAccountPubkey: tokenSaleProgramAccountData.tempTokenAccountPubkey,
        programId: SystemProgram.programId,
        toTokenAccount: buyerTokenAccount.address,
        TOKEN_PROGRAM_ID: TOKEN_PROGRAM_ID,
        tokenPubKey: tokenPubkey,
        PDA: PDA[0],
      });
    const buyTokenIx = new TransactionInstruction({
      programId: tokenSaleProgramId,
      keys: [
        createAccountInfo(buyerKeypair.publicKey, true, true),
        createAccountInfo(tokenSaleProgramAccountData.sellerPubkey, false, true),
        createAccountInfo(tokenSaleProgramAccountData.tempTokenAccountPubkey, false, true),
        createAccountInfo(tokenSaleProgramAccountPubkey, false, false),
        createAccountInfo(SystemProgram.programId, false, false),
        createAccountInfo(new PublicKey(buyerTokenAccount.address), false, true),
        createAccountInfo(TOKEN_PROGRAM_ID, false, false),
        createAccountInfo(tokenPubkey, false, false),
        createAccountInfo(PDA[0], false, false),
      ],
      data: Buffer.from(Uint8Array.of(instruction, ...new BN(number_of_tokens).toArray("le",8))),
    });

    console.log(Uint8Array.of(instruction, ...new BN(number_of_tokens).toArray("le",8)));

    const tx = new Transaction().add(buyTokenIx);

    console.log("sendAndConfirmTransaction");
    console.log("");
    await sendAndConfirmTransaction(connection, tx, [buyerKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    //phase1 end

    //wait block update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    //phase2 (check token sale)
    const sellerTokenAccountBalance = await connection.getTokenAccountBalance(sellerTokenAccountPubkey);
    const tempTokenAccountBalance = await connection.getTokenAccountBalance(tempTokenAccountPubkey);
    const buyerTokenAccountBalance = await connection.getTokenAccountBalance(buyerTokenAccount!.address);

    console.table([
      {
        sellerTokenAccountBalance: sellerTokenAccountBalance.value.uiAmountString,
        tempTokenAccountBalance: tempTokenAccountBalance.value.uiAmountString,
        buyerTokenAccountBalance: buyerTokenAccountBalance.value.uiAmountString,
      },
    ]);

    const sellerSOLBalance = await connection.getBalance(sellerPubkey, "confirmed");
    const buyerSOLBalance = await connection.getBalance(buyerKeypair.publicKey, "confirmed");

    console.table([
      {
        sellerSOLBalance: sellerSOLBalance / LAMPORTS_PER_SOL,
        buyerSOLBalance: buyerSOLBalance / LAMPORTS_PER_SOL,
      },
    ]);

    console.log(`✨TX successfully finished✨\n`);
    //#phase2 end
  } catch (error) {
    console.error("Error processing account data:", error);
    throw error;
  }
};

transaction();
