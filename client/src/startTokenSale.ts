/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from "dotenv";
dotenv.config();

import {
  sendAndConfirmTransaction,
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  SendTransactionError
} from "@solana/web3.js";
import BN = require("bn.js");
import { checkAccountInitialized, checkAccountDataIsValid, createAccountInfo, updateEnv } from "./utils";
import { createTransferInstruction, createInitializeAccountInstruction, AccountLayout,  TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
  TokenSaleAccountLayout,
  TokenSaleAccountLayoutInterface,
  ExpectedTokenSaleAccountLayoutInterface,
} from "./account";
import bs58 = require("bs58");

type InstructionNumber = 0 | 1 | 2 | 3;

const transaction = async () => {
  try {
    console.log("2. Start Token Sale");

    const tokenToTransfer = 100;

    console.log("Setup Transaction");
    const connection = new Connection(process.env.RPCURL!, "confirmed");
    const tokenSaleProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID!);
    
    console.log("Program ID:", tokenSaleProgramId.toBase58());

    // Validate seller info
    console.log("Validating seller account...");
    const sellerPubkey = new PublicKey(process.env.SELLER_PUBLIC_KEY!);
    const secretKey = bs58.decode(process.env.SELLER_PRIVATE_KEY!);
    const sellerPrivateKey = Uint8Array.from(Buffer.from(secretKey));
    const sellerKeypair = new Keypair({
      publicKey: sellerPubkey.toBytes(),
      secretKey: sellerPrivateKey,
    });

    // Create new keypairs with logging
    console.log("Creating program accounts...");
    const tempTokenAccountKeypair = new Keypair();
    console.log("Temp Token Account:", tempTokenAccountKeypair.publicKey.toBase58());
    
    const tokenSaleProgramAccountKeypair = new Keypair();
    console.log("Token Sale Program Account:", tokenSaleProgramAccountKeypair.publicKey.toBase58());

    // Calculate and log space requirements
    const tokenAccountSpace = AccountLayout.span;
    const programAccountSpace = TokenSaleAccountLayout.span;
    
    console.log("Account spaces:", {
      tokenAccountSpace,
      programAccountSpace
    });

    // Get and log rent exemption amounts
    const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(tokenAccountSpace);
    const programAccountRent = await connection.getMinimumBalanceForRentExemption(programAccountSpace);
    
    console.log("Rent amounts:", {
      tokenAccountRent,
      programAccountRent
    });

    const tokenMintAccountPubkey = new PublicKey(process.env.TOKEN_PUBKEY!);
    const tokenDecimal = parseInt(process.env.TOKEN_DECIMAL!);
    const sellerTokenAccountPubkey = new PublicKey(process.env.SELLER_TOKEN_ACCOUNT_PUBKEY!);
    const instruction: InstructionNumber = 0;
    const amountOfTokenForSale = tokenToTransfer * Math.pow(10, tokenDecimal);
    const tokenPrice = parseFloat(process.env.TOKEN_SALE_PRICE!);
    const min_buy = parseFloat(process.env.TOKEN_MIN_BUY!)|0;
    const perTokenPrice = tokenPrice * LAMPORTS_PER_SOL;

    // Create account instructions with explicit logging
    console.log("Creating account instructions...");
    const createTempTokenAccountIx = SystemProgram.createAccount({
      fromPubkey: sellerKeypair.publicKey,
      newAccountPubkey: tempTokenAccountKeypair.publicKey,
      lamports: tokenAccountRent,
      space: tokenAccountSpace,
      programId: TOKEN_PROGRAM_ID,
    });

    const createTokenSaleProgramAccountIx = SystemProgram.createAccount({
      fromPubkey: sellerKeypair.publicKey,
      newAccountPubkey: tokenSaleProgramAccountKeypair.publicKey,
      lamports: programAccountRent,
      space: programAccountSpace,
      programId: tokenSaleProgramId,
    });

    // Initialize temp token account
    const initTempTokenAccountIx = createInitializeAccountInstruction(
      tempTokenAccountKeypair.publicKey,
      tokenMintAccountPubkey,
      sellerKeypair.publicKey,
      TOKEN_PROGRAM_ID
    );

    // Transfer tokens to temp account
    const transferTokenToTempTokenAccountIx = createTransferInstruction(
      sellerTokenAccountPubkey,
      tempTokenAccountKeypair.publicKey,
      sellerKeypair.publicKey,
      amountOfTokenForSale,
      [],
      TOKEN_PROGRAM_ID
    );

    // Initialize token sale program
    const initTokenSaleProgramIx = new TransactionInstruction({
      programId: tokenSaleProgramId,
      keys: [
        createAccountInfo(sellerKeypair.publicKey, true, false),
        createAccountInfo(tempTokenAccountKeypair.publicKey, false, true),
        createAccountInfo(tokenSaleProgramAccountKeypair.publicKey, false, true),
        createAccountInfo(SYSVAR_RENT_PUBKEY, false, false),
        createAccountInfo(TOKEN_PROGRAM_ID, false, false),
      ],
      data: Buffer.from(
        Uint8Array.of(instruction, ...new BN(perTokenPrice).toArray("le", 8), ...new BN(min_buy).toArray("le", 8))
      ),
    });

    console.log("Sending transaction...");
    const tx = new Transaction().add(
      createTempTokenAccountIx,
      initTempTokenAccountIx,
      transferTokenToTempTokenAccountIx,
      createTokenSaleProgramAccountIx,
      initTokenSaleProgramIx
    );

    const txId = await sendAndConfirmTransaction(
      connection, 
      tx, 
      [sellerKeypair, tempTokenAccountKeypair, tokenSaleProgramAccountKeypair],
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      }
    );
    
    console.log("Transaction sent:", txId);

    // Add longer delay for confirmation
    console.log("Waiting for confirmation...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify accounts were created
    console.log("Verifying accounts...");
    const tempAccount = await connection.getAccountInfo(tempTokenAccountKeypair.publicKey);
    const programAccount = await connection.getAccountInfo(tokenSaleProgramAccountKeypair.publicKey);

    if (!tempAccount) {
      throw new Error("Temp token account was not created");
    }
    if (!programAccount) {
      throw new Error("Program account was not created");
    }

    // Verify program account initialization
    const decodedProgramAccount = TokenSaleAccountLayout.decode(
      programAccount.data
    ) as TokenSaleAccountLayoutInterface;

    if (decodedProgramAccount.isInitialized !== 1) {
      console.error("Program account was created but not properly initialized");
      console.log("Program account data:", decodedProgramAccount);
      throw new Error("Program account initialization failed");
    }

    console.log("Program account initialized successfully with data:", {
      isInitialized: decodedProgramAccount.isInitialized,
      sellerPubkey: new PublicKey(decodedProgramAccount.sellerPubkey).toBase58(),
      tempTokenAccountPubkey: new PublicKey(decodedProgramAccount.tempTokenAccountPubkey).toBase58(),
      swapSolAmount: decodedProgramAccount.swapSolAmount,
      swapTokenAmount: decodedProgramAccount.swapTokenAmount,
    });

    // Update environment variables
    const programAccountPubkey = tokenSaleProgramAccountKeypair.publicKey.toString();
    const tempAccountPubkey = tempTokenAccountKeypair.publicKey.toString();
    
    console.log("Saving account addresses to .env:");
    console.log("Program Account:", programAccountPubkey);
    console.log("Temp Account:", tempAccountPubkey);
    
    process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY = programAccountPubkey;
    process.env.TEMP_TOKEN_ACCOUNT_PUBKEY = tempAccountPubkey;
    
    updateEnv();

    // Verify the environment variables were updated
    console.log("\nVerifying .env updates:");
    console.log("TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY:", process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY);
    console.log("TEMP_TOKEN_ACCOUNT_PUBKEY:", process.env.TEMP_TOKEN_ACCOUNT_PUBKEY);

    // Verify the account is still accessible
    const finalCheck = await connection.getAccountInfo(tokenSaleProgramAccountKeypair.publicKey);
    if (!finalCheck) {
      throw new Error("Program account not found after initialization");
    }
    
    console.log("\nFinal account data size:", finalCheck.data.length);
    console.log("Token sale initialized successfully");

  } catch (error) {
    console.error("Error in transaction:", error);
    throw error;
  }
};

transaction().catch(console.error);
