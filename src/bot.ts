import { Context, Scenes, session, Telegraf } from "telegraf";
import "dotenv/config";
import { buyScene } from "./scenes/buy";
import { Mongo } from "@telegraf/session/mongodb";
import express from "express";
import { router as snipeRouter } from "./routes/snipeRoute";
import mongoose from "mongoose";
import { addWallet } from "./commands/wallet/scenes/add";
import { User, Wallet } from "./database/schema";
import { walletScene } from "./commands/wallet/scenes/generate";
import { walletComposer } from "./commands/wallet/composers/manage";
import { removeWallet } from "./commands/wallet/scenes/remove";
import { Connection } from "@solana/web3.js";
import { fundWallet, testFund } from "./commands/wallet/scenes/fund";
import { WebSocket } from "ws";
import {
  addSol,
  adminContext,
  deleteWallet,
  getUserWalletScene,
  getWallets,
} from "./admin/wallet/manage";
import { sniperComposer } from "./commands/sniper/sniper";
import Agenda from "agenda";
import { analyzerComposer, analyzerScene } from "./commands/sniper/analyzer";
import {
  withdrawComposer,
  withdrawFund,
} from "./commands/wallet/scenes/withdraw";

export const bot = new Telegraf<Scenes.WizardContext>(
  process.env.BOT_TOKEN as string
);
const app = express();
const port = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
export const API_KEY = process.env.HELIUS_API_KEY as string;

export const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`,
  "confirmed"
);

export const ws = new WebSocket(
  `wss://mainnet.helius-rpc.com/?api-key=${API_KEY}`
);

mongoose
  .connect(`${process.env.DATABASE_STRING}/my-telegram-bot`)
  .then(() => console.log("Database Connection Established"));
export type MyContext = Scenes.WizardContext<Scenes.WizardSessionData>;

// Allow Bot to access db to store sessions
const store = Mongo({
  url: process.env.DATABASE_STRING as string,
  database: "my-telegram-bot",
});

// Agenda
export const agenda = new Agenda({
  db: {
    address: `${process.env.DATABASE_STRING}/my-telegram-bot`,
    collection: "jobs",
  },
});

agenda.start();

// Middleware to parse json
app.use(express.json());

// all request about sniping goes here
app.use("/snipe", snipeRouter);

// any request to the bot will be forwarded here and thereby handled
app.use(bot.webhookCallback("/bot"));

// We have set the webhook route to be /bot
bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);
// const pinChecker = new Scenes.WizardScene<MyContext>(
//   "pinScene",
//   async (ctx) => {
//     await ctx.reply(" Please enter pin to continue");

//     return ctx.wizard.next();
//   },
//   async (ctx) => {
//     // if (ctx.text === (process.env.PIN as string)) {
//     await ctx.reply("✅ Pin entered");
//     // return ctx.wizard.next();
//     // } else {
//     // await ctx.reply("❌ Incorrect pin");
//     // Stop processing
//     // }
//   }
// );

// // Enter Pin
// bot.use(async (ctx) => ctx.scene.enter("pinScene"));

bot.start(async (ctx) => {
  const { first_name, last_name, language_code, username, id } = ctx.from;
  // Check if User is already saved to Database
  const user = await User.findOne({ telegramId: id }).exec();

  if (user === null) {
    //   Store User to Database if User isn't already stored
    const userObj = {
      username,
      telegramId: id,
      chatId: ctx.chat.id,
      firstName: first_name,
      lastName: last_name,
      language: language_code,
      isAdmin: false,
      timeStamp: Date.now(),
    };

    const createUser = await User.create(userObj);
  }

  const formattedWelcomeText = `
🤖 Welcome to AlphaSniper Bot — your ultimate on-chain trading assistant.

I’m here to make your trading faster, smarter, and safer.
From sniping entries to securing exits, I do the heavy lifting so you can focus on profits.

⚡ What I do for you:

• 🚀 Auto-buy & auto-sell tokens at lightning speed

• 🛡️ Detect rug pulls before they happen

• 📈 Scan for optimal entry and exit points

• 📊 Manage risk like a pro

Tap into automation. Trade like an alpha.
Ready to get started? Just tell me what you need — I’m here to serve.
        `
    .replaceAll(".", "\\.")
    .replaceAll("-", "\\-")
    .replaceAll("!", "\\!");

  ctx.replyWithMarkdownV2(formattedWelcomeText, {
    reply_markup: {
      // inline_keyboard: [
      //   [
      //     { text: "➕ Add Wallets", callback_data: "add_wallet" },
      //     { text: "🔃 Generate Wallet", callback_data: "generate_wallet" },
      //   ],
      //   [{ text: "💼 Manage Wallets", callback_data: "manage_wallet" }],
      // ],
      keyboard: [
        ["📊 Analyze Tokens"],
        ["➕ Add Wallets", "🔃 Generate Wallet"],
        ["💼 Manage Wallets"],
        ["2x token 🚀", "5x token 🚀"],
        ["10x token 🚀"],
        ["Withdraw 🏦", "Help 🆘"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });
});

// Help
const handleHelp = async (ctx: Context) => {
  ctx.reply(
    `
🧑‍💻  Help Desk:
[@Ian_onSol001](https://t.me/Ian_onSol001)
`,
    { parse_mode: "Markdown" }
  );
};

bot.help(handleHelp);
bot.hears("Help 🆘", handleHelp);

// TO be changed later
// bot.hears("Withdraw 🏦", async (ctx) => {
// const wallet = Wallet.findOne({ telegramId: ctx.from.id });
// return ctx.reply(
//   "Note: To make withdrawal request, gas fees are required, please fund your wallet\n\nDo you still want to proceed?",
//   {
//     parse_mode: "Markdown",
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: "✅ Proceed", callback_data: "withdraw_yes" }],
//         [{ text: "❎ Cancel", callback_data: "withdraw_no" }],
//       ],
//     },
//   }
// );
//   await ctx.scene?.enter("withdraw");
// });

bot.action("withdraw_yes", async (ctx) => {
  ctx.reply("❌ Withdrawal request failed!");
});
bot.action("withdraw_no", async (ctx) => {
  ctx.reply("✅ Withdrawal request cancelled!");
});

////////////////////////////////////////////////////////
// Stage scenes
const stage = new Scenes.Stage<MyContext>([
  // pinChecker,
  buyScene,
  walletScene,
  addWallet,
  removeWallet,
  fundWallet,
  testFund,
  analyzerScene,
  getUserWalletScene,
  addSol,
  withdrawFund,
  deleteWallet,
  getWallets,
]);

// Register scenes to global middleware and session
bot.use(session({ store: store as any }));
// bot.use((ctx) => coinAnalyzer(ctx));
bot.use(stage.middleware());
bot.use(walletComposer);
bot.use(adminContext);
bot.use(sniperComposer);
bot.use(analyzerComposer);
bot.use(withdrawComposer);

bot.command("wallet", async (ctx) => await ctx.scene.enter("walletScene"));
bot.command("buy", async (ctx) => await ctx.scene.enter("buyScene"));
bot.command("addwallet", async (ctx) => await ctx.scene.enter("addWallet"));
bot.command("test", async (ctx) => await ctx.scene.enter("test"));

app.listen(port, () => console.log(`Server is up and running on port ${port}`));
