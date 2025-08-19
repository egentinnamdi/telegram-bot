import { Context } from "telegraf";
import { Wallet } from "../database/schema";
import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import { connection } from "../bot";

export const SWAP_URL = `https://lite-api.jup.ag/ultra/v1/order`;

interface TransactionType {
  inputMint: string;
  outputMint: string;
  amount: number;
  privateKey: string;
  publicKey: string;
}

export async function checkWalletName(ctx: Context, walletName: string) {
  // Check if user already has a wallet with this name
  const walletWIthResponseName = await Wallet.findOne({
    $and: [{ telegramId: ctx.from?.id }, { walletName }],
  });

  if (walletWIthResponseName) {
    ctx.reply(
      `⚠️ You already have a wallet with the name ${walletName}, Use a different name`
    );
    return false;
  }
  return true;
}

export async function executeTrade({
  inputMint,
  outputMint,
  amount,
  privateKey,
  publicKey,
}: TransactionType) {
  try {
    const orderResponse = await fetch(
      `${SWAP_URL}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&taker=${publicKey}`
    );
    const order = await orderResponse.json();

    console.log(order, "order here");
    if (order === undefined) return false;

    // Decode the unsigned transaction
    const swapTxnBase64 = order.transaction;
    const swapTxnBuffer = Buffer.from(swapTxnBase64, "base64");
    const swapTxn = VersionedTransaction.deserialize(swapTxnBuffer);

    //Decode private key
    const decoded = base58.decode(privateKey as string);
    const keypair = Keypair.fromSecretKey(decoded);

    // Sign and submit the transaction
    swapTxn.sign([keypair]);
    const signature = await connection.sendTransaction(swapTxn);

    console.log("✅ Transaction sent", signature);

    const balance = await connection.getBalance(
      new PublicKey(publicKey as string)
    );

    return balance;
  } catch (err) {
    console.log(err);
    return false;
  }
}
