import { Keypair } from "@solana/web3.js";
import { Scenes } from "telegraf";
import { connection, MyContext } from "../../../bot";
import { User, Wallet } from "../../../database/schema";
import mongoose from "mongoose";
import base58 from "bs58";

export const walletScene = new Scenes.WizardScene<MyContext>(
  "walletScene",
  async (ctx) => {
    try {
      // Get user
      const telegramId = ctx.from?.id;

      const user = await User.findOne({
        telegramId,
      });
      if (user) {
        (ctx.scene.state as { id: mongoose.Types.ObjectId }).id = user._id;
      }

      // Get wallet
      const walletExists = await Wallet.find({
        userId: user?._id,
      });

      if (walletExists.length === 5) {
        ctx.reply(`⚠️ Maximum number of wallets you can own is 5`);
        return ctx.scene.leave();
      }

      // Ask for wallet Name
      ctx.reply("1️⃣ What name do you want to call this wallet?");

      return ctx.wizard.next();
    } catch (err) {
      const error = err as Error;
      console.log(error);
      ctx.scene.leave();
    }
  },
  async (ctx) => {
    const walletName = ctx.text;

    // Create wallet
    const keypair = Keypair.generate();
    ctx.reply(
      `✅ Wallet created, this is your public key ${keypair.publicKey.toBase58()}`
    );

    const encodedSecretKey = base58.encode(keypair.secretKey);
    // Save private / secret key to database for wallet retrieval
    const balance = await connection.getBalance(keypair.publicKey);

    const walletObj = {
      walletName,
      userId: (ctx.scene.state as { id: mongoose.Types.ObjectId }).id,
      telegramId: ctx.from?.id,
      chatId: ctx.chat?.id,
      privateKey: encodedSecretKey,
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
