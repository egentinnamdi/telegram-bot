import { Scenes } from "telegraf";
import { MyContext } from "../bot";

// We are telling telegraf the kind of scene of scene we want ot set up
export const buyScene = new Scenes.WizardScene<MyContext>(
  "buyScene",
  async (ctx) => {
    // Step !: Ask for token symbol or address
    await ctx.reply(
      "What token do you want to buy? (Enter token symbol or address)"
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Step Two Ask for amount,
    // we can get the response or data from the previous step and save it
    (ctx.wizard.state as any).token = ctx.text;
    await ctx.reply("How much SOL do you want to spend");
    return ctx.wizard.next();
  },
  async (ctx) => {
    (ctx.wizard.state as any).amount = ctx.text;
    const token = (ctx.wizard.state as any).token;
    await ctx.reply(
      `You are about to buy ${token} for ${ctx.text} SOl\nType yes to continue and no to cancel`
    );
  },
  async (ctx) => {
    if (ctx.text?.toLowerCase() === "yes") {
      await ctx.reply("Processing Trade");

      await ctx.reply("Trade completed successfully");
    } else {
      await ctx.reply("Trade Cancelled");
    }

    return ctx.scene.leave(); //Exit scene
  }
);
