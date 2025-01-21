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
  console.log("2. Start Token Sale");

  const tokenToTransfer = 100;

  //phase1 (setup Transaction & send Transaction)
  console.log("Setup Transaction");
  const connection = new Connection(process.env.RPCURL!, "confirmed");
  const tokenSaleProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID!);
  console.log(" -Seller");
  const sellerPubkey = new PublicKey(process.env.SELLER_PUBLIC_KEY!);
  const secretKey = bs58.decode(process.env.SELLER_PRIVATE_KEY!);
  const sellerPrivateKey = Uint8Array.from(Buffer.from(secretKey));
  const sellerKeypair = new Keypair({
    publicKey: sellerPubkey.toBytes(),
    secretKey: sellerPrivateKey,
  });
  console.log(" -Token");
  const tokenMintAccountPubkey = new PublicKey(process.env.TOKEN_PUBKEY!);
  const tokenDecimal = parseInt(process.env.TOKEN_DECIMAL!);
  const sellerTokenAccountPubkey = new PublicKey(process.env.SELLER_TOKEN_ACCOUNT_PUBKEY!);

  console.log(" -sellerTokenAccount Pubkey: ", sellerTokenAccountPubkey.toBase58());
  const instruction: InstructionNumber = 0;
  const amountOfTokenForSale = tokenToTransfer * Math.pow(10, tokenDecimal);
  const tokenPrice = parseFloat(process.env.TOKEN_SALE_PRICE!);
  const min_buy = parseFloat(process.env.TOKEN_MIN_BUY!)|0 ;
  const perTokenPrice = tokenPrice*LAMPORTS_PER_SOL;

  const tempTokenAccountKeypair = new Keypair();
  console.log(" -tempTokenAccount Pubkey: " + tempTokenAccountKeypair.publicKey);
  
  const createTempTokenAccountIx = SystemProgram.createAccount({
    fromPubkey: sellerKeypair.publicKey,
    newAccountPubkey: tempTokenAccountKeypair.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(AccountLayout.span),
    space: AccountLayout.span,
    programId: TOKEN_PROGRAM_ID,
  });

  const tokenSaleProgramAccountKeypair = new Keypair();
  console.log(" -tokenSaleProgramAccount Pubkey: " + tokenSaleProgramAccountKeypair.publicKey);
  
  const createTokenSaleProgramAccountIx = SystemProgram.createAccount({
    fromPubkey: sellerKeypair.publicKey,
    newAccountPubkey: tokenSaleProgramAccountKeypair.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(TokenSaleAccountLayout.span),
    space: TokenSaleAccountLayout.span,
    programId: tokenSaleProgramId,
  });

  const initTempTokenAccountIx = createInitializeAccountInstruction(
    tempTokenAccountKeypair.publicKey,
    tokenMintAccountPubkey,
    sellerKeypair.publicKey,
    TOKEN_PROGRAM_ID
  );

  // Transfer
  const transferTokenToTempTokenAccountIx = createTransferInstruction(
    sellerTokenAccountPubkey,
    tempTokenAccountKeypair.publicKey,
    sellerKeypair.publicKey,
    amountOfTokenForSale,
    [],
    TOKEN_PROGRAM_ID
  );

  console.log(perTokenPrice);
  console.log(min_buy);

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

//make transaction with several instructions(ix)
console.log("Send transaction 1...\n");
// First create and initialize program account
let tx1 = new Transaction().add(
createTokenSaleProgramAccountIx,
initTokenSaleProgramIx
);

try {
await sendAndConfirmTransaction(
    connection, 
    tx1, 
    [sellerKeypair, tokenSaleProgramAccountKeypair],
    {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    }
);
} catch (err) {
if (err instanceof SendTransactionError) {
    console.error("Failed to initialize program account. Transaction error:");
    console.error("Message:", err.message);
    console.error("Transaction logs:");
    err.logs?.forEach(log => console.error(" >", log));
} else {
    console.error("Failed to initialize program account:", err);
}
throw err;
}

// Verify program account initialization
const programAccount = await checkAccountInitialized(
connection,
tokenSaleProgramAccountKeypair.publicKey
);

if (!programAccount) {
throw new Error("Program account not initialized properly");
}

// Now handle token account setup and transfer
let tx2 = new Transaction().add(
createTempTokenAccountIx,
initTempTokenAccountIx,
transferTokenToTempTokenAccountIx
);

try {
await sendAndConfirmTransaction(
    connection,
    tx2,
    [sellerKeypair, tempTokenAccountKeypair],
    {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    }
);
} catch (err) {
if (err instanceof SendTransactionError) {
    console.error("Failed to setup token accounts. Transaction error:");
    console.error("Message:", err.message);
    console.error("Transaction logs:");
    err.logs?.forEach(log => console.error(" >", log));
} else {
    console.error("Failed to setup token accounts:", err);
}
throw err;
}

  //wait block update
  await new Promise((resolve) => setTimeout(resolve, 4000));

//phase2 (check Transaction result is valid)
console.log("Verifying account state...");
const tokenSaleProgramAccount = await checkAccountInitialized(
connection,
tokenSaleProgramAccountKeypair.publicKey
);

if (!tokenSaleProgramAccount) {
throw new Error("Failed to verify program account state");
}

  const encodedTokenSaleProgramAccountData = tokenSaleProgramAccount.data;
  const decodedTokenSaleProgramAccountData = TokenSaleAccountLayout.decode(
    encodedTokenSaleProgramAccountData
  ) as TokenSaleAccountLayoutInterface;

  const expectedTokenSaleProgramAccountData: ExpectedTokenSaleAccountLayoutInterface = {
    isInitialized: 1,
    sellerPubkey: sellerKeypair.publicKey,
    tempTokenAccountPubkey: tempTokenAccountKeypair.publicKey,
    pricePerToken: perTokenPrice,
    min_buy: min_buy,
  };

  console.log("Current TokenSaleProgramAccountData");
  checkAccountDataIsValid(decodedTokenSaleProgramAccountData, expectedTokenSaleProgramAccountData);

  console.table([
    {
      tokenSaleProgramAccountPubkey: tokenSaleProgramAccountKeypair.publicKey.toString(),
    },
  ]);
  console.log(`✨TX successfully finished✨\n`);
  //#phase2 end

  process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY = tokenSaleProgramAccountKeypair.publicKey.toString();
  process.env.TEMP_TOKEN_ACCOUNT_PUBKEY = tempTokenAccountKeypair.publicKey.toString();
  updateEnv();
};

transaction();
