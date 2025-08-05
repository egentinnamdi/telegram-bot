import { Composer, Context } from "telegraf";
import { agenda, bot, MyContext } from "../../bot";
import { User, Wallet } from "../../database/schema";
import { Job, JobAttributesData } from "agenda";
import mongoose from "mongoose";

export const sniperComposer = new Composer<MyContext>();

interface HandleSnipe extends JobAttributesData {
  walletId: mongoose.Types.ObjectId;
}

const handleSnipe = async (ctx: Context, minimumBalance: number) => {
  try {
    // Find User
    const user = await User.findOne({ telegramId: ctx.from?.id });
    if (!user) {
      return ctx.reply(
        "❌ Your account was not found\n\nPlease run the command /start if you haven't already done that to create an account"
      );
    }

    // Check if trade is already Active
    const tradeWallet = await Wallet.findOne({ telegramId: user.telegramId });

    if (tradeWallet?.isActive) {
      return ctx.reply("🔃 Trading still in progress");
    }

    // Retrieve all user wallets
    const wallets = await Wallet.find({ userId: user._id });

    // Loop through wallets and check if any meets the minimum balance

    const checkedWallets = wallets.filter(
      (wallet) => wallet.balance != null && +wallet.balance >= minimumBalance
    );

    if (checkedWallets.length === 0) {
      return ctx.reply(
        `❌ You don't have any wallet with at least ${minimumBalance} sol to initiate this process\n\nPlease fund your wallet to at least ${minimumBalance} sols and try again`
      );
    }

    // Wallet to initiate trade with
    const walletToTradeWIth = checkedWallets[0];

    // Activate snipe on funded wallet
    await Wallet.findByIdAndUpdate(walletToTradeWIth._id, {
      isActive: true,
      tokenMultiplier: minimumBalance,
    });

    const launchPrice = getRandomLaunchPrice();

    agenda?.define("handle snipe", async (job: Job<HandleSnipe>) => {
      const currentBalance = Number(walletToTradeWIth.balance);
      const totalTokenBought = currentBalance / launchPrice;
      const targetPrice = launchPrice * walletToTradeWIth.tokenMultiplier;
      const currentPrice =
        launchPrice * (walletToTradeWIth.tokenMultiplier + Math.random());
      if (currentPrice >= targetPrice) {
        const newBalance = totalTokenBought * currentPrice;

        await Wallet.findByIdAndUpdate(walletToTradeWIth._id, {
          balance: newBalance,
          isActive: false,
        });

        await bot.telegram.sendMessage(
          walletToTradeWIth.chatId,
          `✅ ${
            newBalance - currentBalance
          } SOL profits gained.\n💼 Your new wallet balance is ${newBalance} SOL`
        );
      }
    });

    // Delete old job if it exists
    await agenda.cancel({
      name: "handle snipe",
      "data.walletId": walletToTradeWIth._id,
    });

    // Create new job
    await agenda.schedule("20 minutes", "handle snipe", {
      walletId: walletToTradeWIth._id as mongoose.Types.ObjectId,
    });

    return ctx.reply(`✅ Trading initiated successfully!.`);
  } catch (err) {
    console.log(err);
    return ctx.reply("❌ There was an error, please try again");
  }
};

sniperComposer.hears("2x token 🚀", async (ctx) => {
  await handleSnipe(ctx, 2);
});
sniperComposer.hears("5x token 🚀", async (ctx) => {
  await handleSnipe(ctx, 5);
});
sniperComposer.hears("10x token 🚀", async (ctx) => {
  await handleSnipe(ctx, 10);
});

function getRandomLaunchPrice(min = 0.0000001, max = 0.01) {
  const price = Math.random() * (max - min) + min;
  return parseFloat(price.toFixed(10)); // Round for realism
}
