import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import { Scenes } from "telegraf";
import { connection, MyContext } from "../../../bot";
import { User, userSchema, Wallet } from "../../../database/schema";
import { InferSchemaType, Types } from "mongoose";
import { escapeMarkdownV2 } from "../../../utils/formatText";
import { checkWalletName, getBalance } from "../../../utils/helper";
import { mnemonicToSeedSync, validateMnemonic } from "bip39";
import { derivePath } from "ed25519-hd-key";

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

  // Step Two - Ask How Wallet should be imported

  async (ctx) => {
    try {
      // Check if wallet name is valid
      const isWalletNameValid = await checkWalletName(ctx, ctx.text as string);
      if (!isWalletNameValid) {
        throw Error("❌ Invalid wallet name");
      }
      (ctx.scene.state as WalletState).name = ctx.text ?? "";

      await ctx.reply(
        "Input how you want to import this wallet\n\n" +
          "1️⃣ Import by Private Key\n\n" +
          "2️⃣ Import by Pass phrase" +
          "\n\n✅ Select using the index 1 or 2"
      );
      return ctx.wizard.next();
    } catch (err) {
      console.log(err);
      ctx.reply(
        (err as unknown as Error).message ||
          "❌ There was an error, please try again"
      );
      return ctx.scene.leave();
    }
  },

  // Step Three - Import Wallet Private Key
  async (ctx) => {
    try {
      const importMethod = Number(ctx.text);
      if (importMethod !== 1 && importMethod !== 2) {
        throw Error("❌ Invalid method selection");
      }

      importMethod === 1 &&
        (await ctx.reply("🔐 To import your wallet, Enter it's private key"));
      importMethod === 2 &&
        (await ctx.reply(
          "🪪 Please send your 12 or 24-word Solana wallet passphrase (mnemonic).\n\n⚠️ *Make sure this is a private chat* — never share it elsewhere!",
          { parse_mode: "Markdown" }
        ));

      // Save import method to state for reuse
      (ctx.scene.state as { importMethod: number }).importMethod = importMethod;

      return ctx.wizard.next();
    } catch (err) {
      console.log(err);
      ctx.reply(
        (err as unknown as Error).message ||
          "❌ There was an error, please try again"
      );
      return ctx.scene.leave();
    }
  },
  async (ctx) => {
    try {
      // Check if import selection is by passphrase
      const importMethod = (ctx.scene.state as { importMethod: number })
        .importMethod;

      // Importing with passphrase
      if (importMethod === 2) {
        const phrase = ctx.text?.trim();

        if (!phrase || !validateMnemonic(phrase)) {
          throw Error("❌ Invalid passphrase");
        }
        const seed = mnemonicToSeedSync(phrase);
        const path = "m/44'/501'/0'/0'"; // standard solana derivation
        const derivSeed = derivePath(path, seed.toString("hex")).key;
        const keypair = Keypair.fromSeed(derivSeed);

        const privateKeyBase58 = base58.encode(keypair.secretKey);
        (ctx.scene.state as { privateToken: string }).privateToken =
          privateKeyBase58;

        await ctx.reply("🔃 Importing wallet\n\n click `Continue 👍`", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Continue 👍", callback_data: "continue" }],
            ],
          },
        });

        return ctx.wizard.next();
      }

      // Move to next step if import method is not by passphrase
      (ctx.scene.state as { privateToken: string }).privateToken =
        ctx.text || "";

      await ctx.reply("🔃 Importing wallet\n\n click `Continue 👍`", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Continue 👍", callback_data: "continue" }],
          ],
        },
      });

      return ctx.wizard.next();
    } catch (err) {
      console.log(err);
      ctx.reply(
        (err as unknown as Error).message ||
          "❌ There was an error, please try again"
      );
      return ctx.scene.leave();
    }
  },

  // Step Five - Store to db after verifying that key was provided
  async (ctx) => {
    try {
      const privateToken = (ctx.scene.state as { privateToken: string })
        .privateToken;

      if (!privateToken) {
        return await ctx.reply(
          "🔑 Please provide a valid private key or passphrase"
        );
      }
      if (privateToken.toLowerCase() === "new") {
        await ctx.reply("🔃 Restarting the process, please type `continue`");
        return ctx.wizard.selectStep(0);
      }
      if (privateToken.toLowerCase() === "cancel") {
        await ctx.reply("❎ Process cancelled");
        return ctx.scene.leave();
      }

      // Wallet Name and User Id
      const walletName = (ctx.scene.state as WalletState).name;
      const { _id } = (ctx.scene.state as WalletState).user;
      (ctx.scene.state as WalletState).private = privateToken;

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
      // const balance = await connection.getBalance(publicKey);
      const balance = await getBalance(publicKey);

      const walletObj = {
        walletName,
        userId: _id,
        telegramId: ctx.from?.id,
        chatId: ctx.chat?.id,
        privateKey,
        publicKey,
        balance: balance ?? 0,
        timeStamp: Date.now(),
        botGenerated: false,
        chain: "solana",
      };
      await Wallet.create(walletObj);

      await ctx.reply("✅ Wallet Imported Successfully...");

      return ctx.scene.leave();
    } catch (err) {
      const error = err as Error;
      console.log(error);
      await ctx.reply("❌ Invalid private key, please try again");

      return ctx.scene.leave();
    }
  }
);
