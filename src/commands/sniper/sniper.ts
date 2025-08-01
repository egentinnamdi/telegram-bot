import { Composer, Context } from "telegraf";
import { MyContext } from "../../bot";
import { User, Wallet } from "../../database/schema";

export const sniperComposer = new Composer<MyContext>();

// const options = "2x token" || "5x token" || "10x token";

const handleSnipe = async (ctx: Context, minimumBalance: number) => {
  try {
    // Find User
    const user = await User.findOne({ telegramId: ctx.from?.id });
    if (!user) {
      return ctx.reply(
        "❌ Your account was not found\n\nPlease run the command /start if you haven't already done that to create an account"
      );
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

    // Check if trade is already Active
    const tradeWallet = await Wallet.findById(walletToTradeWIth._id);

    if (tradeWallet?.isActive) {
      return ctx.reply("🔃 Trading still in progress");
    }

    // Activate snipe on funded wallet
    await Wallet.findByIdAndUpdate(walletToTradeWIth._id, {
      isActive: true,
      tokenMultiplier: minimumBalance,
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
