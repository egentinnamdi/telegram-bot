import { Composer, Context } from "telegraf";
import { MyContext } from "../../bot";
import { User, Wallet } from "../../database/schema";
import { initiateSnipeProcess } from "../../services/program.service";

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
        `❌ You don't have any wallet with at least ${minimumBalance} sols to initiate this process\n\nPlease fund your wallet to at least ${minimumBalance} sols and try again`
      );
    }

    // Wallet to initiate trade with
    const walletToTradeWIth = checkedWallets[0];

    // Initiate Snipe Process, pass wallet to trade with hand full control to bot
    await initiateSnipeProcess(walletToTradeWIth);

    return ctx.reply(`
✅ Snipe Initiated Successfully!
Your snipe has been initiated and is now actively monitoring tokens. ⏳
You'll be notified once execution is triggered.
`);
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
