import { Scenes } from "telegraf";
import { connection, MyContext } from "../../../server";
import { watchAccountChanges } from "../../../services/subscription.service";
import { User, Wallet } from "../../../database/schema";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

// Once user hits the fund_wallet action, this activates
export const fundWallet = new Scenes.WizardScene<MyContext>(
  "fundWallet",
  async (ctx) => {
    try {
      const context = ctx.callbackQuery as unknown as {
        data: string;
        message: { text: string };
      };

      const publicKey = context.message.text.split("\n")[6];
      ctx.reply(
        `⚠️ Please fund your wallet by sending SOL to the public address provided. Make sure to send only SOL to avoid losing your fund.\n\n👇👇👇\n\n${publicKey}`,
      );

      // Before leaving scene, subscribe to websocket event
      await watchAccountChanges(publicKey);
      console.log("Websocket event subscribed");

      // Leave
      ctx.scene.leave();
    } catch (err) {
      console.log(err);
      ctx.scene.leave();
    }
  },
);

export const testFund = new Scenes.WizardScene<MyContext>(
  "test",
  async (ctx) => {
    try {
      // Fetch user
      const user = await User.findOne({ telegramId: ctx.from?.id });

      // Fetch wallet
      const wallet = await Wallet.findOne({ userId: user?._id });

      // Send Sol to wallet to trigger event
      if (wallet?.publicKey) {
        const publicKey = new PublicKey(wallet.publicKey);

        await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);

        // Give Feedback and leave scene
        ctx.reply(
          "✅ Test successful, Sol added to wallet, event should trigger now",
        );
        ctx.scene.leave();
      }
    } catch (err) {
      // If error, log and leave scene
      console.log(err);
      ctx.scene.leave();
    }
  },
);
