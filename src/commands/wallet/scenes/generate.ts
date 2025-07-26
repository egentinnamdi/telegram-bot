import { Keypair } from "@solana/web3.js";
import { Scenes } from "telegraf";
import { MyContext } from "../../../bot";
import { User, Wallet } from "../../../database/schema";
import { connection } from "./add";
import mongoose from "mongoose";
import base58 from "bs58";

export const walletScene = new Scenes.WizardScene<MyContext>(
  "walletScene",
  async (ctx) => {
    // Get user
    const telegramId = ctx.from?.id;

    const user = await User.findOne({
      telegramId,
    });
    if (user) {
      (ctx.scene.state as { id: mongoose.Types.ObjectId }).id = user._id;
    }

    // Get wallet
    const walletExists = await Wallet.findOne({
      $and: [{ userId: user?._id }, { botGenerated: true }],
    });

    if (walletExists && walletExists.privateKey) {
      const privatekey = walletExists.privateKey;
      // since user exists, retrieve wallet using the secret key
      const keypairBytes = base58.decode(privatekey);

      const keypair = Keypair.fromSecretKey(keypairBytes);

      ctx.reply(`Wallet found, this is your public key ${keypair.publicKey}`);

      return ctx.scene.leave();
    }

    // Ask for wallet Name
    ctx.reply("What name do you want to call this wallet?");

    return ctx.wizard.next();
  },
  async (ctx) => {
    const walletName = ctx.text;

    // Create wallet
    const keypair = Keypair.generate();
    ctx.reply(
      `Wallet created, this is your public key ${keypair.publicKey.toBase58()}`
    );

    // Save private / secret key to database for wallet retrieval
    const balance = await connection.getBalance(keypair.publicKey);

    const walletObj = {
      walletName,
      userId: (ctx.scene.state as { id: mongoose.Types.ObjectId }).id,
      telegramId: ctx.from?.id,
      privateKey: keypair.secretKey,
      publicKey: keypair.publicKey,
      timeStamp: Date.now(),
      chain: "solana",
      botGenerated: true,
      balance,
    };
    await Wallet.create(walletObj);

    return ctx.scene.leave();
  }
);
