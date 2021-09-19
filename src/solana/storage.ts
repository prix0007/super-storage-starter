import {
    setPayerAndBlockhashTransaction,
    signAndSendTransaction,
    WalletAdapter,
  } from "./wallet";
  import { serialize, deserialize } from "borsh";
  
  import {
    Connection,
    PublicKey,
    RpcResponseAndContext,
    SignatureResult,
    TransactionInstruction,
  } from "@solana/web3.js";

  const programId = new PublicKey(
    "EQmF4YyBbfHGprXaWD69noLdbrtGrR8TJBSeKDUKBupY"
) 
  
  // example ipns cid (length 59)
  // bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
  
  const DUMMY_CID = "00000000000000000000000000000000000000000000000000000000000";
  
  // example name (length 32 characters)  
  const DUMMY_NAME = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
  
  const DUMMY_CREATED_ON = "0000000000000000"; // milliseconds, 16 digits
  
  export class Storage {
    cid: string = DUMMY_CID;
    name: string = DUMMY_NAME;
    created_on: string = DUMMY_CREATED_ON; // max milliseconds in date
    constructor(
      fields: { 
        cid: string; 
        name: string; 
        created_on: string 
      } | undefined = undefined
    ) {
      if (fields) {
        this.cid = fields.cid;
        this.name = fields.name;
        this.created_on = fields.created_on;
      }
    }
  }
  
  const StorageSchema = new Map([
    [
      Storage,
      {
        kind: "struct",
        fields: [
          ["cid", "String"],
          ["name", "String"],
          ["created_on", "String"],
        ],
      },
    ],
  ]);
  
  class StorageService {
    STORAGE_SIZE: number = 0;
    getCertificateSize() {
      const sampleCertificate: Storage = new Storage();
  
      let length = 0;
      length += serialize(StorageSchema, sampleCertificate).length;
  
      this.STORAGE_SIZE = length;
    }
  
    constructor() {
      this.getCertificateSize();
    }

    async getAccountStorageHistory(
      connection: Connection,
      pubKeyStr: string
    ): Promise<void> {
      const sentPubkey = new PublicKey(pubKeyStr);
      const sentAccount = await connection.getAccountInfo(sentPubkey);
      // get and deserialize solana account data and receive data
      if (!sentAccount) { 
        throw Error(`Account ${pubKeyStr} does not exist`);
      }
      
      const data = deserialize(StorageSchema, Storage, sentAccount.data);
      console.log("Inside Storage Trying to decrypt", data);
      return data;
    }
  
    async sendStorage(
      connection: Connection,
      wallet: WalletAdapter,
      destPubkeyStr: string,
      cid: string,
      name: string,
    ): Promise<RpcResponseAndContext<SignatureResult>> {

      console.log("start sendStorage");
      const destPubkey = new PublicKey(destPubkeyStr);
  
      const storageObj = new Storage();
      storageObj.cid = cid;
      storageObj.name = this.getFormattedName(name);
      storageObj.created_on = this.getCreatedOn();

      const messageInstruction = new TransactionInstruction({
        keys: [{ pubkey: destPubkey, isSigner: false, isWritable: true }],
        programId,
        data: Buffer.from(serialize(StorageSchema, storageObj)),
      });
      const trans = await setPayerAndBlockhashTransaction(
        wallet,
        messageInstruction
      );

      const signature = await signAndSendTransaction(wallet, trans);
      const result = await connection.confirmTransaction(
        signature,
        "singleGossip"
      );
      
      const txnData = await connection.getTransaction(signature);
      console.log("Transaction Data", txnData);
      console.log("end sendMessage", result);
      return result
    }
  
    private getFormattedName(name: string): string {
      // save message to arweave and get back txid;
      let fmtname = name;
      const dummyLength = DUMMY_NAME.length - fmtname.length;
      for (let i = 0; i < dummyLength; i++) {
        fmtname += "X";
      }
  
      console.log("Formatted Name: ", fmtname);
      return fmtname;
    }
  
    // get value and add dummy values
    private getCreatedOn(): string {
      const now = Date.now().toString();
      console.log("now", now);
      const total = DUMMY_CREATED_ON.length;
      const diff = total - now.length;
      let prefix = "";
      for (let i = 0; i < diff; i++) {
        prefix += "0";
      }
      const created_on = prefix + now;
      console.log("created_on", created_on);
      return created_on;
    }
  }
  
  const storageService = new StorageService();
  export default storageService;
  