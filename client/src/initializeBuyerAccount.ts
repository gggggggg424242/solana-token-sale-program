import {
Connection,
PublicKey,
Transaction,
TransactionInstruction,
sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getAccount } from "./account";
import * as dotenv from "dotenv";

dotenv.config();

const main = async () => {
console.log("Initializing Buyer Account");
const connection = new Connection(process.env.CLUSTER_URL!, 'confirmed');

// Get accounts
const { tokenSaleProgram, tokenSaleProgramAccount, buyerAccount } = await getAccount();

// Create initialization instruction
const initInstruction = new TransactionInstruction({
    programId: tokenSaleProgram.publicKey,
    keys: [
    { pubkey: tokenSaleProgramAccount.publicKey, isSigner: false, isWritable: true },
    { pubkey: buyerAccount.publicKey, isSigner: true, isWritable: true },
    ],
    data: Buffer.from([0]), // Instruction 0: Initialize
});

// Create and send transaction
const transaction = new Transaction().add(initInstruction);

try {
    const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [buyerAccount],
    { commitment: 'confirmed' }
    );
    console.log("✨Transaction successfully confirmed. Buyer account initialized.");
    console.log(`Transaction signature: ${signature}`);
} catch (error) {
    console.error("Error: ", error);
    throw error;
}
};

main().then(
() => process.exit(),
err => {
    console.error(err);
    process.exit(-1);
},
);

