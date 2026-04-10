import { Composer, Scenes } from "telegraf";
import { agenda, bot, MyContext } from "../../server.js";
import { User, Wallet } from "../../database/schema.js";
import { Job, JobAttributesData } from "agenda";
import mongoose from "mongoose";

export const sniperComposer = new Composer<MyContext>();

interface HandleSnipe extends JobAttributesData {
  walletId: mongoose.Types.ObjectId;
}

export const handleSnipeScene = new Scenes.WizardScene<MyContext>(
  "handleSnipeScene",
  async (ctx) => {
    try {
      const minimumBalance = (ctx.scene.state as any).minimumBalance;

      // Find User
      const user = await User.findOne({ telegramId: ctx.from?.id });
      if (!user) {
        throw Error(
          "❌ Your account was not found\n\nPlease run the command /start if you haven't already done that to create an account",
        );
      }

      // Check if trade is already Active
      const tradeWallet = await Wallet.findOne({
        userId: user._id,
        isActive: true,
      });

      if (tradeWallet?.isActive) {
        throw Error("🔃 Trading still in progress");
      }

      // Retrieve all user wallets with enough sol
      const wallet = await Wallet.find({
        userId: user._id,
        balance: { $gte: minimumBalance },
      });

      (ctx.scene.state as any).wallets = wallet;
      // Loop through wallets and check if any meets the minimum balance

      if (!wallet.length) {
        throw Error(
          `❌ You don't have any wallet with at least ${minimumBalance} sol to initiate this process\n\nPlease fund your wallet to at least ${minimumBalance} sols and try again`,
        );
      }
      await ctx.reply(
        "💰 Which wallet do you want to trade with?\n\n" +
          wallet
            .map(
              (w, index) => `${index + 1}. ${w.walletName} (${w.balance} SOL)`,
            )
            .join("\n") +
          "\n\n✅ Select using the wallet index",
      );

      return ctx.wizard.next();
    } catch (err) {
      console.log(err);
      ctx.reply(
        (err as unknown as Error).message ||
          "❌ There was an error, please try again",
      );
      return ctx.scene.leave();
    }
  },
  async (ctx) => {
    try {
      const wallets = (ctx.scene.state as any).wallets;
      const minimumBalance = (ctx.scene.state as any).minimumBalance;
      const walletIndex = Number(ctx.text) - 1;

      const wallet = wallets[walletIndex];
      if (!wallet) {
        throw Error("❌ Invalid wallet selection");
      }

      // Activate snipe on funded wallet
      await Wallet.findByIdAndUpdate(wallet._id, {
        isActive: true,
        tokenMultiplier: minimumBalance,
      });

      const launchPrice = getRandomLaunchPrice();

      agenda?.define("handle snipe", async (job: Job<HandleSnipe>) => {
        const currentBalance = Number(wallet.balance);
        const totalTokenBought = currentBalance / launchPrice;
        const targetPrice = launchPrice * wallet.tokenMultiplier;
        const currentPrice =
          launchPrice * (wallet.tokenMultiplier + Math.random());
        if (currentPrice >= targetPrice) {
          const newBalance = Number(
            (totalTokenBought * currentPrice).toFixed(2),
          );

          await Wallet.findByIdAndUpdate(wallet._id, {
            balance: newBalance,
            isActive: false,
          });

          await bot.telegram.sendMessage(
            wallet.chatId,
            `✅ ${
              newBalance - currentBalance
            } SOL profits gained.\n💼 Your new wallet balance is ${newBalance} SOL`,
          );
        }
      });

      // Delete old job if it exists
      await agenda.cancel({
        name: "handle snipe",
        "data.walletId": wallet._id,
      });

      // Create new job
      await agenda.schedule("20 minutes", "handle snipe", {
        walletId: wallet._id as mongoose.Types.ObjectId,
      });

      await ctx.reply(`✅ Trading initiated successfully!`);
      return ctx.scene.leave();
    } catch (err) {
      console.log(err);
      ctx.reply(
        (err as unknown as Error).message ||
          "❌ There was an error, please try again",
      );
      return ctx.scene.leave();
    }
  },
);

sniperComposer.hears("2x token 🚀", async (ctx) => {
  await ctx.scene.enter("handleSnipeScene", {
    minimumBalance: 2,
  });
});
sniperComposer.hears("5x token 🚀", async (ctx) => {
  await ctx.scene.enter("handleSnipeScene", {
    minimumBalance: 5,
  });
});
sniperComposer.hears("10x token 🚀", async (ctx) => {
  await ctx.scene.enter("handleSnipeScene", {
    minimumBalance: 10,
  });
});
sniperComposer.hears("❌ Cancel Trade", async (ctx) => {
  await Wallet.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      isActive: false,
    },
  );
  return ctx.reply("✔️ Trade cancelled successfully!");
});

function getRandomLaunchPrice(min = 0.0000001, max = 0.01) {
  const price = Math.random() * (max - min) + min;
  return parseFloat(price.toFixed(10)); // Round for realism
}
