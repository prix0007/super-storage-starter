import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

import {
  setPayerAndBlockhashTransaction,
  signAndSendTransaction,
  WalletAdapter,
} from "./wallet";

const programId =  new PublicKey(
  "EQmF4YyBbfHGprXaWD69noLdbrtGrR8TJBSeKDUKBupY"
)

export async function getStorageAccountPubkey(
  connection: Connection,
  wallet: WalletAdapter,
  space: number,
  reset: boolean = false
): Promise<PublicKey> {

  if (!wallet.publicKey) {
    throw Error("Wallet has no PublicKey");
  }

  let storageAccountPubKey: PublicKey | null = null;
  if (!reset) {
    const existingPubkeyStr = localStorage.getItem(
      wallet.publicKey.toBase58() ?? ""
    );
    if (existingPubkeyStr) {
      storageAccountPubKey = new PublicKey(existingPubkeyStr);
      console.log("Storage account found");
      return storageAccountPubKey;
    }
  }

  console.log("start creating new storage account");

  const STORAGE_SEED = "storage" + Math.random().toString();

  storageAccountPubKey = await PublicKey.createWithSeed(
    wallet.publicKey,
    STORAGE_SEED,
    programId
  );

  console.log("new storage account pubkey", storageAccountPubKey.toBase58());

  console.log("Space require: ", space);

  // Get minimum amount of SOL tokens in the account to make it rent free on blockchain
  const lamports = await connection.getMinimumBalanceForRentExemption(space);

  // Create a instruction for sending
  const instruction = SystemProgram.createAccountWithSeed({
    fromPubkey: wallet.publicKey,
    basePubkey: wallet.publicKey,
    seed: STORAGE_SEED,
    newAccountPubkey: storageAccountPubKey,
    lamports,
    space,
    programId,
  });

  // Create a transaction and fill necessary Details
  let trans = await setPayerAndBlockhashTransaction(wallet, instruction);
  console.log("setPayerAndBlockhashTransaction", trans);

  // Sign the transaction from current connected wallet
  let signature = await signAndSendTransaction(wallet, trans);
  console.log("signAndSendTransaction", signature);

  // Wait for the transaction to get confirmed in the blockchain
  let result = await connection.confirmTransaction(signature, "singleGossip");
  console.log("new storage account created", result);

  localStorage.setItem(
    wallet.publicKey.toBase58(),
    storageAccountPubKey.toBase58()
  );
  
  return storageAccountPubKey;
}
