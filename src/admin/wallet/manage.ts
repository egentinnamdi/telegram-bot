import { Composer, Context, Scenes } from "telegraf";
import { MyContext } from "../../bot";
import { User, Wallet } from "../../database/schema";
import { escapeMarkdownV2 } from "../../utils/formatText";

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
        "❗❗❗ Please enter the username of user whose wallets you to retrieve"
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
💰 *Balance:* ${wallet?.balance}\n
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

const allWallets = async (ctx: Context, type: string) => {
  const user = await User.findOne({ username: ctx.text });

if(user === null){
   return ctx.reply("❌ User not found")
}

  const wallets = await Wallet.find(
    type === "global" ? {} : { userId: user?._id }
  );

  const reply = await Promise.all( wallets.map(async (wallet) => {
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
💰 *Balance:* ${wallet?.balance}\n
🔐 *Public Key:* \`${wallet?.publicKey}\`\n
🔑 *Private Key:* \`${wallet?.privateKey}\`\n
🕒 *Created:* ${wallet?.timeStamp?.toLocaleDateString()}\n
📌 *Chain:* ${wallet?.chain}\n\n\n
`;
    return escapeMarkdownV2(markdownText);
  }));

  return ctx.replyWithMarkdownV2(reply.join(",").replaceAll(",",""));
};

adminContext.command("adminviewwallet", async (ctx) =>
  ctx.scene.enter("getUserWallet")
);
adminContext.command("adminallwallet", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from?.id });
  if (!user?.isAdmin) {
    ctx.reply("❌ This command is reserved only for Admins");
    return ctx.scene.leave();
  }
  return allWallets(ctx, "global");
});
