/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from "dotenv";
import bs58 = require("bs58");

dotenv.config();

import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SendTransactionError,
} from "@solana/web3.js";
import BN = require("bn.js");
import { checkAccountInitialized, checkAccountDataIsValid, createAccountInfo } from "./utils";

import {
  TokenSaleAccountLayout,
  TokenSaleAccountLayoutInterface,
  ExpectedTokenSaleAccountLayoutInterface,
} from "./account";

type InstructionNumber = 0 | 1 | 2 | 3;

const transaction = async () => {
  try {
    console.log("Update Token price");

    //phase1 (setup Transaction & send Transaction)
    console.log("Setup Transaction");
    const connection = new Connection(process.env.RPCURL!, "confirmed");
    const tokenSaleProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID!);
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
    const tokenSaleProgramAccountPubkey = new PublicKey(process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY!);
    const tempTokenAccountPubkey = new PublicKey(process.env.TEMP_TOKEN_ACCOUNT_PUBKEY!);
    console.log("sellerTokenAccountPubkey: ", sellerTokenAccountPubkey.toBase58());
    const instruction: InstructionNumber = 3;

    const newPerTokenPrice = 0.002 * LAMPORTS_PER_SOL;
    const min_buy = parseFloat(process.env.TOKEN_MIN_BUY!)|0 ;

    const updateTokenPriceIx = new TransactionInstruction({
      programId: tokenSaleProgramId,
      keys: [
        createAccountInfo(sellerKeypair.publicKey, true, true),
        createAccountInfo(tokenSaleProgramAccountPubkey, false, true),
      ],
      data: Buffer.from(Uint8Array.of(instruction, ...new BN(newPerTokenPrice).toArray("le", 8))),
    });

    console.log("Sending transaction...");
    const tx = new Transaction().add(updateTokenPriceIx);

    try {
      const signature = await connection.sendTransaction(tx, [sellerKeypair], {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      console.log("Transaction sent with signature:", signature);
      
      await connection.confirmTransaction(signature, "confirmed");
      console.log("Transaction confirmed");

    } catch (error) {
      if (error instanceof SendTransactionError) {
        console.error("Transaction failed:", error.message);
        console.error("Logs:", error.logs);
      } else {
        console.error("Error sending transaction:", error);
      }
      throw error;
    }

    //phase2 (check Transaction result is valid)
    const tokenSaleProgramAccount = await checkAccountInitialized(connection, tokenSaleProgramAccountPubkey);

    const encodedTokenSaleProgramAccountData = tokenSaleProgramAccount.data;
    const decodedTokenSaleProgramAccountData = TokenSaleAccountLayout.decode(
      encodedTokenSaleProgramAccountData
    ) as TokenSaleAccountLayoutInterface;

    const expectedTokenSaleProgramAccountData: ExpectedTokenSaleAccountLayoutInterface = {
      isInitialized: 1,
      sellerPubkey: sellerKeypair.publicKey,
      tempTokenAccountPubkey: tempTokenAccountPubkey,
      swapSolAmount: newPerTokenPrice,
      swapTokenAmount: min_buy,
    };

    console.log("Current TokenSaleProgramAccountData");
    checkAccountDataIsValid(decodedTokenSaleProgramAccountData, expectedTokenSaleProgramAccountData);

    console.table([
      {
        pricePerToken: newPerTokenPrice / LAMPORTS_PER_SOL + " SOL",
      },
    ]);
    console.log(`✨TX successfully finished✨\n`);
    //#phase2 end

  } catch (error) {
    console.error("Error in update price transaction:", error);
    throw error;
  }
};

transaction().catch(console.error);
