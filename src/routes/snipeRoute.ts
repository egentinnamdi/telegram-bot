import express from "express";
import { Meta, Wallet, walletSchema } from "../database/schema";
import { agenda, bot } from "../bot";
import { DEX_ENDPOINT } from "../commands/sniper/analyzer";
import mongoose, { InferSchemaType } from "mongoose";
import { executeTrade } from "../utils/helper";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAndAnalyzeDetailedTokenReport } from "../utils/checks";

export const router = express.Router();

const quoteToken = "So11111111111111111111111111111111111111112";

export type TokenPriceType = Array<{
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
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    h24: number;
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
    header: string;
    openGraph: string;
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
    // Data
    const event = req.body[0];
    if (event && event.type === "CREATE_POOL") {
      const newlyLaunchedToken = event.tokenTransfers[0].mint;

      const isTokenValid = await getAndAnalyzeDetailedTokenReport(
        newlyLaunchedToken
      );

      // Skip or proceed with token based on token report
      // if (!isTokenValid) return;

      // Run this token through thorough checks

      // Check if token exists first
      const existingToken = await Meta.findOne({
        tokenAddress: newlyLaunchedToken,
      });

      if (!existingToken) {
        // Store token immediately
        await Meta.create({
          tokenAddress: newlyLaunchedToken,
        });
      }

      console.log(newlyLaunchedToken);

      const tokens = await Meta.find();

      tokens.map((token) => {
        let isFetching = false;

        agenda.define(`checkPrice-${token.tokenAddress}`, async (job, done) => {
          // Find active trades
          if (isFetching) return;
          isFetching = true;

          try {
            const response = await fetch(
              `${DEX_ENDPOINT}/${token.tokenAddress}`,
              {
                method: "GET",
                headers: {
                  Accept: "*/*",
                },
              }
            );

            const result = (await response.json()) as TokenPriceType;

            const filtered = result.filter(
              (item) => item.dexId === "raydium"
            )[0];
            console.log(filtered);

            if (filtered === undefined) {
              return;
            }
            // Update token name
            await Meta.findByIdAndUpdate(token._id, {
              tokenName: filtered.baseToken.name,
              createdAt: new Date(filtered.pairCreatedAt * 1000),
            });

            const currentPrice = +filtered?.priceNative;

            // Set launch price
            if (!token.launchPrice) {
              await Meta.findByIdAndUpdate(token._id, {
                launchPrice: currentPrice,
              });
            }

            // Get launch price
            const launchPrice = (await Meta.findById(token._id))?.launchPrice;
            if (!launchPrice) return;

            let tradingWallets: Array<
              InferSchemaType<typeof walletSchema> & {
                _id: mongoose.Types.ObjectId;
              }
            >;

            const percentagePriceIncrease =
              ((currentPrice - launchPrice) / launchPrice) * 100;

            if (percentagePriceIncrease > 10) {
              tradingWallets = await Wallet.find({
                $and: [
                  { isActive: true },
                  { isTrading: true },
                  { tokenTraded: token.tokenAddress },
                ],
              });
            } else {
              tradingWallets = await Wallet.find({
                $or: [
                  {
                    $and: [{ isActive: true }, { isTrading: false }],
                  },
                  {
                    $and: [{ isActive: true }, { isTrading: true }],
                  },
                ],
              });
            }

            // Get Active but not yet trading wallets
            tradingWallets.map(async (activeWallet) => {
              const currentBalance = Number(activeWallet.balance);
              const amount = currentBalance * LAMPORTS_PER_SOL;
              const targetPrice = launchPrice * activeWallet.tokenMultiplier;

              // If user is not actively trading yet, set trading, get order and sign it
              if (!activeWallet.isTrading) {
                const balance = await executeTrade({
                  inputMint: quoteToken,
                  outputMint: token.tokenAddress,
                  amount,
                  privateKey: activeWallet.privateKey as string,
                  publicKey: activeWallet.publicKey as string,
                });

                if (balance === false) return;
                // After Buying coin, set trading to true
                await Wallet.findByIdAndUpdate(activeWallet._id, {
                  isTrading: true,
                  tokenTraded: token.tokenAddress,
                  balance,
                });
              }

              if (currentPrice >= targetPrice) {
                // Sell coin for sol
                const totalSol = (activeWallet.balance ?? 0) * currentPrice;
                const newBalance = (await executeTrade({
                  inputMint: token.tokenAddress,
                  outputMint: quoteToken,
                  amount: totalSol,
                  privateKey: activeWallet.privateKey as string,
                  publicKey: activeWallet.publicKey as string,
                })) as number;

                // Store new balance to db and deactivate isActive
                await Wallet.findByIdAndUpdate(activeWallet._id, {
                  balance: newBalance,
                  isActive: false,
                  isTrading: false,
                  tokenTraded: "",
                  tokenMultiplier: 0,
                });

                // Send Notification to user
                await bot.telegram.sendMessage(
                  activeWallet.chatId,
                  `✅ ${
                    newBalance - currentBalance
                  } SOL profits gained.\n💼 Your new wallet balance is ${newBalance} SOL`
                );
              }
            });
          } catch (err) {
            console.log(err);
          } finally {
            isFetching = false;
            done();
          }
        });

        if (token.tokenAddress) {
          agenda.every("5 seconds", `checkPrice-${token.tokenAddress}`);
        }
      });
    }
  } catch (err) {
    console.error("Webhook error:", err);
  }
});
