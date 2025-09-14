import { Composer, Context, Scenes } from "telegraf";
import { MyContext } from "../../bot";
import { User, Wallet } from "../../database/schema";
import { escapeMarkdownV2 } from "../../utils/formatText";
import { WizardScene } from "telegraf/scenes";

export const adminContext = new Composer<MyContext>();

// Get All wallet
export const getUserWalletScene = new Scenes.WizardScene<MyContext>(
  "getUserWallet",
  async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from?.id });
      if (!user?.isAdmin) {
        ctx.reply("❌ This command is reserved only for Admins");
        return ctx.scene.leave();
      }
      ctx.replyWithMarkdownV2(
        "🔍 Do you want to retrieve a single wallet by entering its name 🏷️, or fetch all wallets linked to the user 👤?\n\nPlease select one option below ⬇️",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "1️⃣ Retrieve a single wallet",
                  callback_data: "retrieve_single_wallet",
                },
              ],
              [
                {
                  text: "🅰️ Retrieve all user wallets",
                  callback_data: "retrieve_multiple_wallet",
                },
              ],
            ],
          },
        }
      );
      ctx.wizard.next();
    } catch (err) {
      ctx.scene.leave();
    }
  },
  async (ctx) => {
    const context = ctx.callbackQuery as unknown as {
      data: string;
      message: { text: string };
    };
    if (context?.data === "retrieve_single_wallet") {
      (ctx.scene.state as any).query = context?.data;
      ctx.reply("🔍 What is the name of the wallet you want to retrieve?");
      return ctx.wizard.next();
    } else if (context?.data === "retrieve_multiple_wallet") {
      (ctx.scene.state as any).query = context?.data;
      ctx.reply(
        "❗❗❗ Please enter the username of the user whose wallets you want to retrieve"
      );
      return ctx.wizard.next();
    }
    {
      return ctx.scene.leave();
    }
  },
  async (ctx) => {
    if ((ctx.scene.state as any).query === "retrieve_single_wallet") {
      const wallet = await Wallet.findOne({ walletName: ctx.text });
      const user = await User.findById(wallet?.userId);

      const markdownText = `
*🪪 Wallet Information*

👜 *Wallet Name:* ${wallet?.walletName}\n
👤 *Owner:* ${user?.username}\n
💰 *Balance:* ${wallet?.balance}\n SOL
🔐 *Public Key:* \`${wallet?.publicKey}\`\n
🔑 *Private Key:* \`${wallet?.privateKey}\`\n
🕒 *Created:* ${wallet?.timeStamp?.toLocaleDateString()}\n
📌 *Chain:* ${wallet?.chain}
`;
      wallet === null
        ? ctx.reply("❌ Wallet not found")
        : ctx.replyWithMarkdownV2(escapeMarkdownV2(markdownText));

      ctx.scene.leave();
    } else {
      await allWallets(ctx, "user");
      ctx.scene.leave();
    }
  }
);

// Add SOL scene

export const addSol = new Scenes.WizardScene<MyContext>(
  "addsol",
  async (ctx) => {
    ctx.reply("How much SOL do you want to add to this wallet?");
    ctx.wizard.next();
  },
  async (ctx) => {
    (ctx.scene.state as any).amount = Number(ctx.text);
    ctx.reply(
      "💰 What is the name of the wallet you want to add to?\n\n⚠️ Type wallet name exactly the way it is, letters are case sensitive"
    );
    ctx.wizard.next();
  },
  async (ctx) => {
    try {
      const walletName = ctx.text;
      const amount = (ctx.scene.state as { amount: number }).amount;
      // Find Wallet and Add to it
      await Wallet.findOneAndUpdate({ walletName }, { balance: amount });

      ctx.reply(`Wallet has been updated with ${amount} SOL`);
      ctx.scene.leave();
    } catch (err) {
      console.log(err);
      ctx.scene.leave();
    }
  }
);

export const getWallets = new Scenes.WizardScene<MyContext>(
  "get-wallets",
  async (ctx) => {
    // Get all wallets and calculate the number of pages it contains
    const allWallets = await Wallet.find();
    const numberOfPages = Math.ceil(allWallets.length / 5);
    (ctx.scene.state as { pageLength: number }).pageLength = numberOfPages;

    ctx.reply(
      `ℹ️ There ${
        numberOfPages > 1 ? "are" : "is"
      } currently ${numberOfPages} ${
        numberOfPages > 1 ? "pages" : "page"
      } of wallets, Input the page number you want to retrieve or just click "Continue 👍" to retrieve the first page\n\n⚠️ Wallets have been paginated to prevent server overload, Maximum of 5 wallets can be retrieved per request`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Continue 👍", callback_data: "continue_wallet" }],
          ],
        },
      }
    );

    ctx.wizard.next();
  },
  async (ctx) => {
    try {
      const pageLength = (ctx.scene.state as { pageLength: number }).pageLength;
      const pageNumber = Number(ctx.text);
      console.log(typeof pageNumber);
      const context = ctx.callbackQuery as unknown as {
        data: string;
      };

      if (context?.data === "continue_wallet") {
        await allWallets(ctx, "global");
      }

      if (pageNumber && (Number.isNaN(pageNumber) || pageNumber > pageLength)) {
        throw Error("❌ Input a valid number");
      }

      const skip = (pageNumber - 1) * 5;
      await allWallets(ctx, "global", skip);

      ctx.reply(
        "⬆️ Next feature that will be added to this admin command is the ability to go to the next page using a 'Next' button\n\nStay tuned ✅"
      );

      ctx.scene.leave();
    } catch (err) {
      console.log(err);
      ctx.reply((err as Error).message);
      ctx.scene.leave();
    }
  }
);

const allWallets = async (ctx: Context, type: string, skip?: number) => {
  const user = await User.findOne({ username: ctx.text });

  if (user === null && type === "user") {
    return ctx.reply("❌ User not found");
  }

  // Paginate Wallets to retrieve, 10 per page
  const wallets = await Wallet.find(
    type === "global" ? {} : { userId: user?._id }
  )
    .skip(skip ?? 0)
    .limit(5);

  wallets.map(async (wallet) => {
    const userGlobal =
      type === "global" ? await User.findById(wallet.userId) : null;
    const markdownText = `
*🪪 Wallet Information*

👜 *Wallet Name:* ${wallet?.walletName}\n
${
  type === "user"
    ? `👤 *Username:* ${user?.username}`
    : `👤 *Username:* ${userGlobal?.username}`
}\n
💰 *Balance:* ${wallet?.balance}\n SOL
🔐 *Public Key:* \`${wallet?.publicKey}\`\n
🔑 *Private Key:* \`${wallet?.privateKey}\`\n
🕒 *Created:* ${wallet?.timeStamp?.toLocaleDateString()}\n
📌 *Chain:* ${wallet?.chain}\n\n\n
`;
    const markdownModified = escapeMarkdownV2(markdownText);
    ctx.reply(markdownModified, {
      parse_mode: "Markdown",
    });
  });
};

// Delete wallets
export const deleteWallet = new WizardScene<MyContext>(
  "delete-wallets",
  async (ctx) => {
    ctx.reply(
      "⚠️ List a max of 5 wallets you want to delete per request separating each with a comma and maintain the casing of the wallet name"
    );
    ctx.wizard.next();
  },
  async (ctx) => {
    try {
      // Get Wallets to be deleted and split into an array
      const walletsToDeleteArr = ctx.text
        ?.split(",")
        .map((item) => item.trim());

      if (walletsToDeleteArr && walletsToDeleteArr.length > 5) {
        throw Error("❌ Max of 5 wallets can be deleted at a time");
      }

      walletsToDeleteArr?.forEach(async (item) => {
        // Delete wallet individually by wallet name
        const deletedWallet = await Wallet.findOneAndDelete({
          walletName: item,
        });

        if (!deletedWallet) {
          ctx.reply(
            `❌ The wallet "${item}" was not found in the database record\n\n⚠️ Cross-check the spelling and casing and try again`
          );
        } else {
          ctx.reply(
            `✅ The wallet ${deletedWallet?.walletName} has been deleted successfully`
          );
        }
      });

      ctx.scene.leave();
    } catch (err) {
      console.log(err);
      ctx.reply((err as Error).message);
      ctx.scene.leave();
    }
  }
);

adminContext.command("adminviewwallet", async (ctx) =>
  ctx.scene.enter("getUserWallet")
);
adminContext.command("adminallwallet", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from?.id });
  if (!user?.isAdmin) {
    return ctx.reply("❌ This command is reserved only for Admins");
  }
  ctx.scene.enter("get-wallets");
});

adminContext.command("adminaddsol", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from?.id });
  if (!user?.isAdmin) {
    return ctx.reply("❌ This command is reserved only for admins");
  }

  ctx.scene.enter("addsol");
});

adminContext.command("admindeletewallets", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user?.isAdmin) {
    return ctx.reply("❌ This command is reserved only for admins");
  }

  ctx.scene.enter("delete-wallets");
});
