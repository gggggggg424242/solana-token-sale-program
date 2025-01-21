import { PublicKey } from "@solana/web3.js";

//@ts-expect-error missing types
import * as BufferLayout from "buffer-layout";

export const TokenSaleAccountLayout = BufferLayout.struct([
  BufferLayout.u8("isInitialized"),           // 1 byte - Account initialization status
  BufferLayout.blob(32, "sellerPubkey"),      // 32 bytes - Seller's public key
  BufferLayout.blob(32, "tempTokenAccountPubkey"), // 32 bytes - Temporary token account public key
  BufferLayout.blob(8, "swapSolAmount"),      // 8 bytes - Price per token in lamports
  BufferLayout.blob(8, "swapTokenAmount"),    // 8 bytes - Minimum purchase amount in tokens
]);

export interface TokenSaleAccountLayoutInterface {
  [index: string]: number | Uint8Array;
  isInitialized: number;
  sellerPubkey: Uint8Array;
  tempTokenAccountPubkey: Uint8Array;
  swapSolAmount: Uint8Array;
  swapTokenAmount: Uint8Array;
}

export interface ExpectedTokenSaleAccountLayoutInterface {
  [index: string]: number | PublicKey;
  isInitialized: number;
  sellerPubkey: PublicKey;
  tempTokenAccountPubkey: PublicKey;
  swapSolAmount: number;
  swapTokenAmount: number;
}