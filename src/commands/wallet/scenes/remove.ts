import { Scenes } from "telegraf";
import { MyContext } from "../../../server.js";
import { Wallet } from "../../../database/schema.js";
import { escapeMarkdownV2 } from "../../../utils/formatText.js";

export const removeWallet = new Scenes.WizardScene<MyContext>(
  "removeWallet",
  async (ctx) => {
    try {
      const context = ctx.callbackQuery as unknown as {
        data: string;
        message: { text: string };
      };

      if (context?.data === "find_remove_wallet") {
        ctx.reply("What is the name of the Wallet you want to remove?");
        return ctx.wizard.next();
      } else {
        const walletName =
          context?.message.text.split("\n")[3] || context?.data;

        (ctx.scene.state as { walletName: string }).walletName = walletName;
        ctx.replyWithMarkdownV2(
          `If this wallet was not imported, removing it means losing all SOL in it\nAre you sure you want to remove ${walletName}?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "👍 Yes", callback_data: "remove_wallet_yes" }],
                [{ text: "👎 No", callback_data: "remove_wallet_no" }],
              ],
            },
          },
        );
        return ctx.wizard.next();
      }
    } catch (error) {
      console.log(error);
      ctx.scene.leave();
    }
  },
  async (ctx) => {
    try {
      const context = ctx.callbackQuery as unknown as {
        data: string;
      };
      if (context?.data === "remove_wallet_yes") {
        const deleted = await Wallet.findOneAndDelete({
          walletName: (ctx.scene.state as { walletName: string }).walletName,
        });
        if (deleted) {
          ctx.reply("✅ Wallet removed successfully");
        } else {
          ctx.reply("❌ Wallet not found");
        }
        return ctx.scene.leave();
      } else if (context?.data === "remove_wallet_no") {
        ctx.reply("❌ Wallet not removed");

        return ctx.scene.leave();
      } else {
        ctx.replyWithMarkdownV2(
          escapeMarkdownV2(
            `🗑️ Starting the removal process for wallet '${ctx.text}'.`,
          ),
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "👉 Continue", callback_data: ctx.text as string }],
              ],
            },
          },
        );
        return ctx.wizard.selectStep(0);
      }
    } catch (error) {
      console.log(error);
      ctx.scene.leave();
    }
  },
);
