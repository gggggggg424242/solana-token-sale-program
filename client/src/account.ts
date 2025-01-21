import { PublicKey } from "@solana/web3.js";

//@ts-expect-error missing types
import * as BufferLayout from "buffer-layout";

export const TokenSaleAccountLayout = BufferLayout.struct([
  BufferLayout.u8("isInitialized"),           // 1 byte - Account initialization status
  BufferLayout.blob(32, "sellerPubkey"),      // 32 bytes - Seller's public key
  BufferLayout.blob(32, "tempTokenAccountPubkey"), // 32 bytes - Temporary token account public key
  BufferLayout.blob(8, "pricePerToken"),      // 8 bytes - Price per token in lamports
  BufferLayout.blob(8, "min_buy"),            // 8 bytes - Minimum purchase amount in tokens
]);

export interface TokenSaleAccountLayoutInterface {
  [index: string]: number | Uint8Array;
  isInitialized: number;
  sellerPubkey: Uint8Array;
  tempTokenAccountPubkey: Uint8Array;
  pricePerToken: Uint8Array;
  min_buy: Uint8Array;
}

export interface ExpectedTokenSaleAccountLayoutInterface {
  [index: string]: number | PublicKey;
  isInitialized: number;
  sellerPubkey: PublicKey;
  tempTokenAccountPubkey: PublicKey;
  pricePerToken: number;
  min_buy: number;
}