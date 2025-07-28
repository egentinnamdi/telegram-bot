import { Context } from "telegraf";
import { escapeMarkdownV2 } from "../../utils/formatText";
import { API_KEY } from "../../bot";

const NETWORK = "mainnet-beta";
const URL = "https://api.shyft.to";

export const coinAnalyzer = async (ctx: Context) => {
  try {
    // headers
    const myHeaders = new Headers();
    myHeaders.append("x-api-key", API_KEY);
    myHeaders.append("Content-Type", "application/json");

    const endpoints = [
      "/sol/v1/token/get_info",
      "/sol/v1/token/get_owners?limit=15&offset=0",
    ];

    // Request Options
    const options = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow" as RequestRedirect,
    };

    const responses = await Promise.all(
      endpoints.map((endpoint) =>
        fetch(
          `${URL}${endpoint}?network=${NETWORK}&token_address=${ctx.text}`,
          options
        )
      )
    );
    const results = await Promise.all(
      responses.map((response) => {
        if (!response.ok) {
          const text = response.text();
          console.error("Error:", response.status, text);
          return;
        }
        return response.json();
      })
    );
    const data = results[0].result;
    console.log(data);

    if (!data.address) {
      return;
    }
    return ctx.replyWithMarkdownV2(
      escapeMarkdownV2(`
## 🪙 Token Analysis Report

### **1. Basic Information**
- **Name:** ${data.name}
- **Symbol:** ${data.symbol}
- **Mint Address:** ${data.address}
- **Creation Date:**  
- **Creator Address:**  

---

### **2. Market & Liquidity**
- **Current Price (USD):**  
- **Liquidity Pool Address:**  
- **Liquidity Amount (USD):**  
- **DEX Platform:** (Raydium, Orca, etc.)  
- **Exit Liquidity:** (How much can be sold back)  

---

### **3. Supply & Holders**
- **Total Supply:**  
- **Circulating Supply:**  ${data.current_supply}
- **Decimals:**  ${data.decimals}
- **Top Holder %:**  
- **Deployer Wallet %:**  
- **Number of Holders:**  

---

### **4. Trading Activity**
- **24h Volume (USD):**  
- **Number of Trades (24h):**  
- **Buy/Sell Ratio:**  
- **Whale Activity:** (Largest single buy/sell)  

---

### **5. Security Checks**
- **Honeypot Status:** (Can you sell?)  
- **Blacklist or Freeze Authority:**  
- **Mint Authority Status:** (Revoked or still active?)  
- **Freeze Authority Status:**  

---

### **6. Trend Indicators**
- **Price Change (1h, 24h):**  
- **Trending Rank:**  
- **Social Mentions:**  

---

### **7. Metadata**
- **Logo URL:**  
- **Website:**  
- **Telegram/Discord:**  
- **Description:**  
`)
    );
  } catch (err) {
    console.log(err);
  }
};
