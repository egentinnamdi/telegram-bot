import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import { Scenes } from "telegraf";
import { connection, MyContext } from "../../../bot";
import { User, userSchema, Wallet } from "../../../database/schema";
import { InferSchemaType, Types } from "mongoose";
import { escapeMarkdownV2 } from "../../../utils/formatText";

type WalletState = {
  name: string;
  private: string;
  user: InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
};

// Everything that happens when user enter /addwallet command
export const addWallet = new Scenes.WizardScene<MyContext>(
  "addWallet",
  // Step One - Check User and Name Wallet
  async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from?.id });

    // Redirect and leave scene if user doesn't exist
    if (!user) {
      await ctx.reply(
        "⛔ User not found, first create a user profile by running /start"
      );
      return ctx.scene.leave();
    }

    (ctx.scene.state as WalletState).user = user;
    await ctx.reply("1️⃣ What do you want to call this wallet?");

    return ctx.wizard.next();
  },

  // Step Two - Import Wallet Private Key
  async (ctx) => {
    (ctx.scene.state as WalletState).name = ctx.text ?? "";
    ctx.reply("🔐 To import your wallet, Enter it's private key");
    return ctx.wizard.next();
  },

  // Step Three - Store to db after verifying that key was provided
  async (ctx) => {
    try {
      if (!ctx.text) {
        return ctx.reply("🔑 Please provide your wallet private key");
      }
      if (ctx.text.toLowerCase() === "new") {
        ctx.reply("🔃 Restarting the process, please type `continue`");
        return ctx.wizard.selectStep(0);
      }
      if (ctx.text.toLowerCase() === "cancel") {
        ctx.reply("❎ Process cancelled");
        return ctx.scene.leave();
      }

      // Wallet Name and User Id
      const walletName = (ctx.scene.state as WalletState).name;
      const { _id } = (ctx.scene.state as WalletState).user;
      (ctx.scene.state as WalletState).private = ctx.text;

      // Decode privatekey to bytes
      const privateKeyBytes = base58.decode(
        (ctx.scene.state as WalletState).private
      );
      // Get Wallet info
      const keypair = Keypair.fromSecretKey(privateKeyBytes);

      // Query DB and check if private key or Wallet name already exists
      const exists = await Wallet.findOne({
        $and: [
          {
            $or: [{ walletName }, { privateKey: privateKeyBytes }],
          },
          {
            botGenerated: false,
          },
        ],
      });

      if (exists) {
        const message = escapeMarkdownV2(
          "⚠️ *You've already added this wallet.*\n" +
            "Type `new` to restart the process or `cancel` to exit."
        );

        ctx.replyWithMarkdownV2(message);

        return ctx.wizard.selectStep(2);
      }

      // Wallet Public Key
      const publicKey = keypair.publicKey;

      // Wallet Private Key

      const privateKey = base58.encode(keypair.secretKey);

      // Onchain (solana) information
      const balance = await connection.getBalance(publicKey);

      const walletObj = {
        walletName,
        userId: _id,
        telegramId: ctx.from?.id,
        chatId: ctx.chat?.id,
        privateKey,
        publicKey,
        balance,
        timeStamp: Date.now(),
        botGenerated: false,
        chain: "solana",
      };
      await Wallet.create(walletObj);

      ctx.reply("✅ Wallet Imported Successfully...");

      return ctx.scene.leave();
    } catch (err) {
      const error = err as Error;
      console.log(error);
      ctx.reply("❌ Invalid private key, please try again");

      return ctx.scene.leave();
    }
  }
);
