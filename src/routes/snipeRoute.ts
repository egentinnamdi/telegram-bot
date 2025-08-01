import express from "express";
import { Meta, Wallet } from "../database/schema";
import { bot } from "../bot";

export const router = express.Router();
const RAYDIUM_ENDPOINT = "https://api-v3.raydium.io/mint/price";

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
    // Data
    const event = req.body[0];

    if (event && event.type === "CREATE_POOL") {
      const newlyLaunchedToken = event.tokenTransfers[0].mint;
      // Activated wallets
      const activatedWallets = await Wallet.find({ isActive: true });

      const clearId = setInterval(async () => {
        try {
          const response = await fetch(
            `${RAYDIUM_ENDPOINT}?mints=${newlyLaunchedToken}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );

          const result = await response.json();

          activatedWallets.map(async (activeWallet) => {
            const launchPrice = (
              await Meta.findOne({ telegramId: activeWallet.telegramId })
            )?.launchPrice;

            // Price not equal to 0, which means trade is currently going on
            if (launchPrice !== 0) {
              return;
            }

            const currentPrice = result.data[newlyLaunchedToken];

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
        }
      }, 5000);

      const stillActive = activatedWallets.filter(
        (item) => item.isActive === true
      );
      if (stillActive.length === 0) {
        clearInterval(clearId);
      }
    }
  } catch (err) {
    console.error("Webhook error:", err);
  }
});
