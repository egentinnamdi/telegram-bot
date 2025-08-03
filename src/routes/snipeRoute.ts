import express from "express";
import { Meta, Wallet } from "../database/schema";
import { bot } from "../bot";

export const router = express.Router();

type TokenPriceType = Array<{
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels: string[];
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    ANY_ADDITIONAL_PROPERTY: {
      buys: string;
      sells: string;
    };
  };
  volume: {
    ANY_ADDITIONAL_PROPERTY: string;
  };
  priceChange: {
    ANY_ADDITIONAL_PROPERTY: string;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info: {
    imageUrl: string;
    websites: {
      url: string;
    }[];
    socials: {
      platform: string;
      handle: string;
    }[];
  };
  boosts: {
    active: number;
  };
}>;

// General step
// Get users subscribe to the sniping functionality
// Get the data sent in web hook

// In production
// Run coin through extensive checks
// if checks are passed, get swap quote of a swap route
// Once swap quote is found, sign transaction using the wallet and coin is bought
// once coin is bought, Monitor Price movements and sell once the 2x 5x or 10x target is meet
// Once sold, send notification to user and updated wallet balance

// In Beta Stage (for tutorials)
// Once coin is found
// Start monitoring its price
// Once price hit user's target (2x 5x 10x)
// Send notification to user along with a pseudo wallet balance update

// Beta processing
// New coin
// const newlyLaunchedToken = "7B2ADKMe9SD79Nmeno1kc3vnX2PPWUpwUFeLjXfJ2Vew";

router.post("/webhook", async (req, res) => {
  try {
    const DEXSCREENER_ENDPOINT =
      "https://api.dexscreener.com/token-pairs/v1/solana";
    // Data
    // const event = req.body[0];

    // if (event && event.type === "CREATE_POOL") {
    // const newlyLaunchedToken = event.tokenTransfers[0].mint;
    const newlyLaunchedToken = "6TarfrgpWS7zJN8eeJqzsYm1GfDMzouxePffy71aTT9f";
    // Activated wallets
    const activatedWallets = await Wallet.find({ isActive: true });
    let isFetching = false;
    console.log(newlyLaunchedToken);
    setInterval(async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const response = await fetch(
          `https://api.dexscreener.com/token-pairs/v1/solana/${newlyLaunchedToken}`,
          {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
              Accept: "*/*",
            },
          }
        );

        const result = (await response.json()) as TokenPriceType;
        const filtered = result.filter((item) => item.dexId === "raydium")[0];

        activatedWallets.map(async (activeWallet) => {
          const launchPrice = (
            await Meta.findOne({ telegramId: activeWallet.telegramId })
          )?.launchPrice;

          // Price not equal to 0, which means trade is currently going on
          if (launchPrice !== 0) {
            return;
          }

          const currentPrice = +filtered.priceNative;

          if (!launchPrice)
            await Meta.create({
              launchPrice: Number(currentPrice),
              telegramId: activeWallet.telegramId,
            });

          const currentBalance = Number(activeWallet.balance);
          const totalBoughtToken =
            (launchPrice ?? currentPrice) * currentBalance;
          const targetPrice =
            (launchPrice ?? currentPrice) * activeWallet.tokenMultiplier;

          console.log(currentPrice);

          if (currentPrice >= targetPrice) {
            const newBalance = totalBoughtToken * currentPrice;

            // Store new balance to db and deactivate isActive
            await Wallet.findByIdAndUpdate(activeWallet._id, {
              balance: newBalance,
              isActive: false,
            });

            // Set launch Price to 0
            await Meta.findOneAndUpdate(
              { telegramId: activeWallet.telegramId },
              {
                launchPrice: 0,
              }
            );

            // Send Notification to user
            await bot.telegram.sendMessage(
              activeWallet.chatId,
              `✅ ${
                newBalance - currentBalance
              } SOL profits gained.\n💼 Your new wallet balance is ${newBalance} SOL`
            );
          }
          return;
        });
      } catch (err) {
        console.log(err);
      } finally {
        isFetching = false;
      }
    }, 5000);

    // const stillActive = activatedWallets.filter(
    //   (item) => item.isActive === true
    // );
    // }
  } catch (err) {
    console.error("Webhook error:", err);
  }
});
