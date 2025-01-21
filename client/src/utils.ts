import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TokenSaleAccountLayoutInterface, ExpectedTokenSaleAccountLayoutInterface } from "./account";
import BN = require("bn.js");
import fs = require("fs");

const envItems = [
  "CUSTOM_PROGRAM_ID",
  "SELLER_PUBLIC_KEY",
  "SELLER_PRIVATE_KEY",
  "BUYER_PUBLIC_KEY",
  "BUYER_PRIVATE_KEY",
  "TOKEN_PUBKEY",
  "TOKEN_DECIMAL",
  "RPCURL",
  // "API_URL",
  "TOKEN_SALE_PRICE",
  "TOKEN_MIN_BUY",
  "SELLER_TOKEN_ACCOUNT_PUBKEY",
  "TEMP_TOKEN_ACCOUNT_PUBKEY",
  "TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY",
];

export function updateEnv() {
  const eol = "\n";
  const envContents = envItems.map((item) => `${item}=${process.env[item]}`).join(eol);
  fs.writeFileSync(".env", envContents);
}

export const getKeypair = (publicKey: string, privateKey: Uint8Array) =>
  new Keypair({
    publicKey: new PublicKey(publicKey).toBytes(),
    secretKey: privateKey,
  });

export const getTokenBalance = async (pubkey: PublicKey, connection: Connection) => {
  return parseInt((await connection.getTokenAccountBalance(pubkey)).value.amount);
};

export const createAccountInfo = (pubkey: PublicKey, isSigner: boolean, isWritable: boolean) => {
  return {
    pubkey: pubkey,
    isSigner: isSigner,
    isWritable: isWritable,
  };
};

export const checkAccountInitialized = async (connection: Connection, customAccountPubkey: PublicKey) => {
  console.log("Checking account:", customAccountPubkey.toBase58());
  
  const customAccount = await connection.getAccountInfo(customAccountPubkey);

  if (customAccount === null || customAccount.data.length === 0) {
    console.error("Account does not exist or has no data");
    process.exit(1);
  }

  // Decode and check initialization
  const decodedData = TokenSaleAccountLayout.decode(customAccount.data) as TokenSaleAccountLayoutInterface;
  
  if (decodedData.isInitialized !== 1) {
    console.error("Account exists but is not initialized properly");
    console.log("Initialization status:", decodedData.isInitialized);
    process.exit(1);
  }

  return customAccount;
};

export const checkAccountDataIsValid = (
  customAccountData: TokenSaleAccountLayoutInterface,
  expectedCustomAccountState: ExpectedTokenSaleAccountLayoutInterface
) => {
  const keysOfAccountData = Object.keys(customAccountData);
  const data: { [char: string]: string } = {};

  keysOfAccountData.forEach((key) => {
    const value = customAccountData[key];
    const expectedValue = expectedCustomAccountState[key];

    //PublicKey
    if (value instanceof Uint8Array && expectedValue instanceof PublicKey) {
      if (!new PublicKey(value).equals(expectedValue)) {
        console.log(`${key} is not matched expected one`);
        process.exit(1);
      }
    } else if (value instanceof Uint8Array && typeof expectedValue === "number") {
      //value is undefined
      if (!value) {
        console.log(`${key} flag has not been set`);
        process.exit(1);
      }

      //value is not matched expected one.
      const isBufferSame = Buffer.compare(value, Buffer.from(new BN(expectedValue).toArray("le", value.length)));

      if (isBufferSame !== 0) {
        console.log(`[${key}] : expected value is ${expectedValue}, but current value is ${value}`);
        process.exit(1);
      }
    }

    data[key] = expectedValue.toString();
  });
  console.table([data]);
};
