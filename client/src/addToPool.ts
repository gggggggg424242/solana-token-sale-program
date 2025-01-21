/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from "dotenv";
dotenv.config();

import {
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SendTransactionError
} from "@solana/web3.js";
import { 
  createTransferInstruction, 
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import { checkAccountInitialized, updateEnv } from "./utils";
import bs58 = require("bs58");

const transaction = async () => {
  try {
    console.log("Setup Transaction");
    console.log(" -Seller");
    console.log(" -Token");

    const connection = new Connection(process.env.RPCURL!, "confirmed");
    
    // Setup seller account
    const sellerPubkey = new PublicKey(process.env.SELLER_PUBLIC_KEY!);
    const secretKey = bs58.decode(process.env.SELLER_PRIVATE_KEY!);
    const sellerPrivateKey = Uint8Array.from(Buffer.from(secretKey));
    const sellerKeypair = new Keypair({
      publicKey: sellerPubkey.toBytes(),
      secretKey: sellerPrivateKey,
    });

    // Get token mint
    const tokenMintPubkey = new PublicKey(process.env.TOKEN_PUBKEY!);
    const tokenDecimal = parseInt(process.env.TOKEN_DECIMAL!);
    const tokenAmountToAdd = parseInt(process.env.TOKEN_AMOUNT!) || 100; // Default to 100 if not specified
    const amountOfTokenForSale = tokenAmountToAdd * (10 ** tokenDecimal);
    
    console.log(`Adding ${tokenAmountToAdd} tokens (${amountOfTokenForSale} base units) to pool...`);

    // Get or create seller token account
    console.log("Getting seller token account...");
    const sellerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sellerKeypair,
      tokenMintPubkey,
      sellerKeypair.publicKey
    );
    console.log("Seller token account:", sellerTokenAccount.address.toBase58());

    // Verify seller has enough SOL for account creation
    const sellerSOLBalance = await connection.getBalance(sellerKeypair.publicKey);
    const minBalanceForAccountCreation = await connection.getMinimumBalanceForRentExemption(165); // Token account size
    if (sellerSOLBalance < minBalanceForAccountCreation) {
      throw new Error(`Seller needs at least ${minBalanceForAccountCreation / LAMPORTS_PER_SOL} SOL for account creation`);
    }

    // Create temp token account
    console.log("Creating temp token account...");
    const tempTokenAccountKeypair = new Keypair();
    const tempTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sellerKeypair,
      tokenMintPubkey,
      tempTokenAccountKeypair.publicKey
    );
    console.log("Temp token account:", tempTokenAccount.address.toBase58());

    // Transfer tokens to temp account
    console.log("Transferring tokens to temp account...");
    const transferIx = createTransferInstruction(
      sellerTokenAccount.address,
      tempTokenAccount.address,
      sellerKeypair.publicKey,
      amountOfTokenForSale,
      [],
      TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(transferIx);

    try {
      const signature = await sendAndConfirmTransaction(
        connection, 
        tx, 
        [sellerKeypair],
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );
      console.log("Transfer successful. Signature:", signature);

      // Verify balances
      const sellerTokenBalance = await connection.getTokenAccountBalance(sellerTokenAccount.address);
      const tempBalance = await connection.getTokenAccountBalance(tempTokenAccount.address);
      
      console.table([{
        sellerTokenBalance: sellerTokenBalance.value.uiAmountString,
        tempTokenBalance: tempBalance.value.uiAmountString
      }]);

      // Update environment variables
      process.env.SELLER_TOKEN_ACCOUNT_PUBKEY = sellerTokenAccount.address.toString();
      process.env.TEMP_TOKEN_ACCOUNT_PUBKEY = tempTokenAccount.address.toString();
      updateEnv();

      console.log("Environment variables updated");

    } catch (error) {
      if (error instanceof SendTransactionError) {
        console.error("Transaction failed:", error.message);
        console.error("Logs:", error.logs);
      } else {
        console.error("Error:", error);
      }
      throw error;
    }

  } catch (error) {
    console.error("Error in setup:", error);
    throw error;
  }
};

transaction().catch(console.error);