import { Composer, Scenes } from "telegraf";
import { MyContext } from "../../bot";
import { TokenPriceType } from "../../routes/snipeRoute";

export const analyzerComposer = new Composer<MyContext>();
export const DEX_ENDPOINT = "https://api.dexscreener.com/token-pairs/v1/solana";

export const analyzerScene = new Scenes.WizardScene<MyContext>(
  "analyzerScene",
  async (ctx) => {
    ctx.reply("🪙 What is the address of the token you want to analyze?");
    ctx.wizard.next();
  },
  async (ctx) => {
    try {
      const tokenAddress = ctx.text;
      const response = await fetch(`${DEX_ENDPOINT}/${tokenAddress}`, {
        method: "GET",
        headers: {
          Accept: "*/*",
        },
      });

      const result = (await response.json()) as TokenPriceType;
      const filtered = result.filter((item) => item.dexId === "raydium")[0];

      console.log(filtered);

      ctx.reply(
        `🪙 *Token Analysis*

🔗 [View on Dexscreener](https://dexscreener.com/solana/by3gje18rtuqsxdjefh9otdjyaswyrjl3mqg53tkwjyr)
🧬 *DEX:* ${filtered?.dexId}  
🪙 *Chain:*  ${filtered?.chainId}
🏷️ *Pair Address:* ${filtered?.pairAddress}  
🔖 *Label:* ${filtered?.labels?.[0]}

💱 *Token Pair:*
• 🧾 *Base:* ${filtered?.baseToken.name}  
• 💰 *Quote:* ${filtered?.quoteToken.name}

💸 *Price:*
• 🟡 Native Price (price in Sol): ${filtered?.priceNative}  
• 💵 USD Price: ${filtered?.priceUsd}

💰 *Volume (USD):*
• ⏱️ 5 mins: ${filtered?.volume.m5.toLocaleString()}  
• ⏱️ 1 hour: ${filtered?.volume.h1.toLocaleString()}  
• ⏱️ 6 hours: ${filtered?.volume.h6.toLocaleString()}  
• ⏱️ 24 hours: ${filtered?.volume.h24.toLocaleString()}

📈 *Price Change:*  
• ⏱️ 24 hours: ${filtered?.priceChange.h24}% ${
          filtered?.priceChange.h24?.toString().includes("-") ? "🔴" : "🟢"
        }

💦 *Liquidity:*
• 💵 USD: ${filtered?.liquidity.usd.toLocaleString()}  
• 🧱 USDC (base): ${filtered?.liquidity.base.toLocaleString()}  
• 🪙 USDT (quote): ${filtered?.liquidity.quote.toLocaleString()}

🏦 *Valuation:*
• 🏛️ FDV: $${filtered?.fdv.toLocaleString()}  
• 📈 Market Cap: $${filtered?.marketCap.toLocaleString()}

ℹ️ *More Info*
• 📉 Open Graph: ${filtered?.info.openGraph}

📅 *Pair Created At:* ${new Date(filtered?.pairCreatedAt).toUTCString()}
`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "⚡ Buy 0.5 SOL", callback_data: "0.5_sol" },
                { text: "⚡ Buy 1 SOL", callback_data: "one_sol" },
              ],
              [
                { text: "⚡ Buy 2 SOL", callback_data: "two_sol" },
                { text: "⚡ Buy 5 SOL", callback_data: "five_sol" },
              ],
              [
                { text: "⚡ Buy 7 SOL", callback_data: "seven_sol" },
                { text: "⚡ Buy 10 SOL", callback_data: "ten_sol" },
              ],
            ],
          },
        }
      );
      ctx.wizard.next();
    } catch (err) {
      console.log(err);
      ctx.reply(
        "❌ There was an error analyzing this token, make sure the token address is correct"
      );
      ctx.scene.leave();
    }
  },
  async (ctx) => {
    try {
      const callbackData = (ctx.callbackQuery as any).data;
      ctx.reply("There was an error processing this");
      ctx.scene.leave();
    } catch (err) {
      ctx.reply("❌ There was an error processing this");
      ctx.scene.leave();
    }
  }
);

analyzerComposer.command(
  "analyze",
  async (ctx) => await ctx.scene.enter("analyzerScene")
);
analyzerComposer.hears(
  "📊 Analyze Tokens",
  async (ctx) => await ctx.scene.enter("analyzerScene")
);

// 📊 *Transaction Activity:*
// _(No detailed txn data for display here; values were objects)_
