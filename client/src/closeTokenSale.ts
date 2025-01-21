/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from "dotenv";
dotenv.config();

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  SendTransactionError,
} from "@solana/web3.js";
import { createAccountInfo, checkAccountInitialized } from "./utils";
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TokenSaleAccountLayoutInterface, TokenSaleAccountLayout } from "./account";
import bs58 = require("bs58");

type InstructionNumber = 0 | 1 | 2 | 3;

const transaction = async () => {
  try {
    console.log("4. Close Token Sale");
    console.log("Setup Transaction");
    
    const connection = new Connection(process.env.RPCURL!, "confirmed");
    const tokenSaleProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID!);

    // Get buyer info
    const buyerPubkey = new PublicKey(process.env.BUYER_PUBLIC_KEY!);
    const tokenPubkey = new PublicKey(process.env.TOKEN_PUBKEY!);

    // Verify program account exists before proceeding
    const tokenSaleProgramAccountPubkey = new PublicKey(process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY!);
    console.log("Checking program account:", tokenSaleProgramAccountPubkey.toBase58());
    
    const programAccount = await connection.getAccountInfo(tokenSaleProgramAccountPubkey);
    if (!programAccount) {
      throw new Error("Program account not found. It may have been closed already.");
    }
    console.log("Program account exists with data size:", programAccount.data.length);

    // Setup seller
    const sellerPubkey = new PublicKey(process.env.SELLER_PUBLIC_KEY!);
    const secretKey = bs58.decode(process.env.SELLER_PRIVATE_KEY!);
    const sellerPrivateKey = Uint8Array.from(Buffer.from(secretKey));
    const sellerKeypair = new Keypair({
      publicKey: sellerPubkey.toBytes(),
      secretKey: sellerPrivateKey,
    });

    // Check seller balance
    const sellerBalance = await connection.getBalance(sellerKeypair.publicKey);
    console.log("Seller balance:", sellerBalance / LAMPORTS_PER_SOL, "SOL");

    if (sellerBalance < LAMPORTS_PER_SOL) {
      console.log("Requesting airdrop for seller...");
      const signature = await connection.requestAirdrop(
        sellerKeypair.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(signature);
      console.log("Airdrop completed");
    }

    const sellerTokenAccountPubkey = new PublicKey(process.env.SELLER_TOKEN_ACCOUNT_PUBKEY!);
    const tempTokenAccountPubkey = new PublicKey(process.env.TEMP_TOKEN_ACCOUNT_PUBKEY!);
    const instruction: InstructionNumber = 2;

    // Get buyer token account
    console.log("Getting buyer token account...");
    const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sellerKeypair, // we can use seller as payer since we're just getting the account
      tokenPubkey,
      buyerPubkey,
      undefined,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    const PDA = await PublicKey.findProgramAddressSync([Buffer.from("token_sale")], tokenSaleProgramId);

    const closeTokenSaleIx = new TransactionInstruction({
      programId: tokenSaleProgramId,
      keys: [
        createAccountInfo(sellerPubkey, true, true),
        createAccountInfo(sellerTokenAccountPubkey, false, true),
        createAccountInfo(tempTokenAccountPubkey, false, true),
        createAccountInfo(TOKEN_PROGRAM_ID, false, false),
        createAccountInfo(PDA[0], false, false),
        createAccountInfo(tokenSaleProgramAccountPubkey, false, true),
      ],
      data: Buffer.from(Uint8Array.of(instruction)),
    });

    console.log("Sending close transaction...");
    const tx = new Transaction().add(closeTokenSaleIx);

    try {
      const signature = await connection.sendTransaction(tx, [sellerKeypair], {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      console.log("Transaction sent:", signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");
      console.log("Close transaction confirmed");

      // Verify account closure
      const finalCheck = await connection.getAccountInfo(tokenSaleProgramAccountPubkey);
      if (finalCheck) {
        console.warn("Warning: Program account still exists after close instruction");
      } else {
        console.log("Program account successfully closed");
      }

      // Check final balances
      const sellerTokenAccountBalance = await connection.getTokenAccountBalance(sellerTokenAccountPubkey);
      const buyerTokenAccountBalance = await connection.getTokenAccountBalance(buyerTokenAccount.address);

      console.table([
        {
          sellerTokenAccountBalance: sellerTokenAccountBalance.value.uiAmountString,
          buyerTokenAccountBalance: buyerTokenAccountBalance.value.uiAmountString,
        },
      ]);

      const finalSellerSOLBalance = await connection.getBalance(sellerPubkey);
      const finalBuyerSOLBalance = await connection.getBalance(buyerPubkey);

      console.table([
        {
          sellerSOLBalance: finalSellerSOLBalance / LAMPORTS_PER_SOL,
          buyerSOLBalance: finalBuyerSOLBalance / LAMPORTS_PER_SOL,
        },
      ]);

    } catch (error) {
      if (error instanceof SendTransactionError) {
        console.error("Transaction failed:", error.message);
        console.error("Logs:", error.logs);
      } else {
        console.error("Error sending transaction:", error);
      }
      throw error;
    }

    console.log(`✨Token sale closed successfully✨\n`);

  } catch (error) {
    console.error("Error in close token sale:", error);
    throw error;
  }
};

transaction().catch(console.error);
