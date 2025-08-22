import { Composer, Scenes } from "telegraf";
import { MyContext } from "../../../bot";
import { User, Wallet } from "../../../database/schema";

export const withdrawComposer = new Composer<MyContext>();

export const withdrawFund = new Scenes.WizardScene<MyContext>(
  "withdraw",
  async (ctx) => {
    ctx.reply("💵 How do you want to withdraw?", {
      //   reply_markup: {
      //     inline_keyboard: [
      //       [{ text: "💵 2 SOL", callback_data: "two_sol" }],
      //       [{ text: "💵 5 SOL", callback_data: "five_sol" }],
      //       [{ text: "💵 10 SOL", callback_data: "ten_sol" }],
      //     ],
      //   },
    });
    ctx.wizard.next();
  },
  async (ctx) => {
    // Check if Input is a Number
    const amountToWithdraw = Number(ctx.text);
    if (isNaN(amountToWithdraw)) {
      ctx.reply("⚠️ Please enter a valid number");
      return ctx.scene.leave();
    }

    // const context = ctx.callbackQuery as unknown as { data: string };
    // Get Wallet and Check if balance is not greater than
    const wallet = await Wallet.findOne({ telegramId: ctx.from?.id });
    console.log(wallet?.balance);
    if (wallet?.balance && amountToWithdraw < wallet.balance) {
      ctx.reply("⚠️ You do not have enough balance to withdraw");
      return ctx.scene.leave();
    }

    ctx.reply("You will be charged 10% of your withdrawal amount", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Continue", callback_data: "continue_withdraw" }],
          [{ text: "❌ Cancel", callback_data: "cancel_withdraw" }],
        ],
      },
    });
    ctx.wizard.next();
  },
  async (ctx) => {
    try {
      const context = ctx.callbackQuery as unknown as { data: string };
      if (
        context.data === "continue_withdraw" ||
        context.data === "cancel_withdraw"
      ) {
        throw Error("Invalid option selected");
      }
      if (context.data === "cancel_withdraw") {
        ctx.reply("✅ Withdrawal cancelled");
        return ctx.scene.leave();
      }

      ctx.reply("🔃 Transaction in progress");
      const wallet = Wallet.findOne({ telegramId: ctx.from?.id });
      //   agenda?.define("handle snipe", async (job: Job<HandleSnipe>) => {

      //     ctx.
      //       await bot.telegram.sendMessage(
      //         wallet.chatId,
      //         `Your funds will arrive soon`
      //       );
      //     }
      //   });
    } catch (err) {
      console.log(err);
      ctx.reply("An error occcured, please try again");
      return ctx.scene.leave();
    }
  }
);

withdrawComposer.hears("Withdraw 🏦", async (ctx) => {
  // Find User first
  const user = User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    return ctx.reply("You need to have an account first before continuing");
  }
  ctx.scene.enter("withdraw");
});
