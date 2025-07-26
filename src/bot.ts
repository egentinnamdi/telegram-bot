import { Scenes, session, Telegraf } from "telegraf";
import "dotenv/config";
import { buyScene } from "./scenes/buy";
import { Mongo } from "@telegraf/session/mongodb";
import express from "express";
import { router as snipeRouter } from "./routes/snipeRoute";
import mongoose from "mongoose";
import { addWallet } from "./commands/wallet/scenes/add";
import { User } from "./database/schema";
import { walletScene } from "./commands/wallet/scenes/generate";
import { walletComposer } from "./commands/wallet/composers/manage";
import { removeWallet } from "./commands/wallet/scenes/remove";

const bot = new Telegraf<Scenes.WizardContext>(process.env.BOT_TOKEN as string);
const app = express();
const port = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

mongoose
  .connect(`${process.env.DATABASE_STRING}/my-telegram-bot`)
  .then(() => console.log("Database Connection Established"));
export type MyContext = Scenes.WizardContext<Scenes.WizardSessionData>;

// Allow Bot to access db to store sessions
const store = Mongo({
  url: process.env.DATABASE_STRING as string,
  database: "my-telegram-bot",
});

// Middleware to parse json
app.use(express.json());

// all request about sniping goes here
app.use("/snipe", snipeRouter);

// any request to the bot will be forwarded here and thereby handled
app.use(bot.webhookCallback("/bot"));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// We have set the webhook route to be /bot
bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);

bot.start(async (ctx) => {
  const { first_name, last_name, language_code, username, id } = ctx.from;
  // Check if User is already saved to Database
  const user = await User.findOne({ telegramId: id }).exec();

  if (user === null) {
    //   Store User to Database if User isn't already stored
    const userObj = {
      username,
      telegramId: id,
      firstName: first_name,
      lastName: last_name,
      language: language_code,
      isAdmin: false,
      timeStamp: Date.now(),
    };

    const createUser = await User.create(userObj);
    console.log(createUser);
  }

  const formattedWelcomeText = `
*Welcome ${first_name || "there"}!* 👋 

I'm your friendly assistant bot 🤖.
Here's what I can do:

1. ℹ️ *Updates* - Give you live update about market conditions and signal on when to enter a trade.

2. 📈 *Trade* - I can automatically handle trades for you, buy coins immediately they launch and sell once the conditions are right.

3. 👛 *Wallet* - You can store your wallet information here so I can help you with your trades.

4. ⚙️ *Settings* - You can also change and update your user preferences here.

5. 🔍 *Search* - You can search for any token on the market and get real-time information about it.

👉 Please choose an option below to get started:
        `
    .replaceAll(".", "\\.")
    .replaceAll("-", "\\-")
    .replaceAll("!", "\\!");

  ctx.replyWithMarkdownV2(formattedWelcomeText, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "➕ Add Wallets", callback_data: "add_wallet" },
          { text: "🔃 Generate Wallet", callback_data: "generate_wallet" },
        ],
        [{ text: "💼 Manage Wallets", callback_data: "manage_wallet" }],
      ],
      // keyboard: [
      //   ["➕ Add Wallets", "💼 Manage Wallets"],
      //   ["🔃 Generate Wallet", "⚙️ Settings"],
      // ],
      // resize_keyboard: true,
      // one_time_keyboard: false,
    },
  });
});

// Stage scenes
const stage = new Scenes.Stage<MyContext>([
  buyScene,
  walletScene,
  addWallet,
  removeWallet,
]);

// Register scenes to global middleware and session
bot.use(session({ store: store as any }));
bot.use(stage.middleware());
bot.use(walletComposer);

bot.command("wallet", async (ctx) => await ctx.scene.enter("walletScene"));
bot.command("buy", async (ctx) => await ctx.scene.enter("buyScene"));
bot.command("addwallet", async (ctx) => await ctx.scene.enter("addWallet"));

app.listen(port, () => console.log(`Server is up and running on port ${port}`));
