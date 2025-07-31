import mongoose, { Schema } from "mongoose";

// User Document
export const userSchema = new Schema({
  username: String,
  telegramId: String,
  firstName: String,
  LastName: String,
  isAdmin: Boolean,
  language: String,
  timeStamp: Date,
});

export const User = mongoose.model("User", userSchema);

// Wallet Document
export const walletSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  telegramId: String,
  chatId: {
    type: String,
    required: true,
  },
  walletName: String,
  publicKey: String,
  privateKey: String,
  balance: String,
  chain: String,
  botGenerated: Boolean,
  timeStamp: Date,
});

export const Wallet = mongoose.model("Wallet", walletSchema);

// Trade Document
const tradeSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "No userId provided"],
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["buy", "sell"],
  },
  token: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return /^[A-HJ-NP-Z1-9a-km-z]{32,44}$/.test(v);
      },
    },
  },
  amountSol: {
    type: Number,
    required: true,
    min: [0.01, "Minimum trade amount is 0.01 SOL"],
    max: [10, "Maximum trade amount is 10 SOL"],
    default: 0.1,
  },
  // Shared Field
  priorityFee: {
    type: Number,
    min: [0, "Priority fee must be positive"],
    default: 150000,
  },
  // Buy Specific Fields
  maxSlippage: {
    type: Number,
    min: [1, "Slippage must be at least 1%"],
    max: [50, "Slippage cannot exceed 50%"],
    default: 30,
  },
  autoSell: {
    type: Boolean,
    default: false,
  },
  liquidityCheck: {
    type: Number,
    min: [0, "Liquidity must be greater than 0"],
    default: 1000,
  },
  honeyChecks: {
    type: Boolean,
    default: true,
  },
  buyTaxLimit: {
    type: Number,
    min: [0, "Buy tax must be greater than 0"],
    max: [0, "Buy tax cannot exceed, 50%"],
    default: 10,
  },
  sellTaxLimit: {
    type: Number,
    min: [0, "Sell tax must be greater than 0"],
    max: [50, "Sell tax cannot exceed 50%"],
    default: 10,
  },
  // Sell specific Fields
  sellTargetX: {
    type: Number,
    min: [1.1, "Sell target must be greater than 1x"],
    default: 2,
  },
  stopLossPercent: {
    type: Number,
    min: [1, "Stop loss must be greater than 1%"],
    max: [99, "Stop loss must be less than 99%"],
    default: 50,
  },
  trailingStop: {
    type: Number,
    min: [0, "Trailing stop must be >= 0"],
    max: [99, "Trailing stop must be < 99%"],
    default: null,
  },
  sellAmount: {
    type: Number,
    min: [1, "Sell amount must be at least 1%"],
    max: [100, "Sell amount cannot exceed 100%"],
    default: 100, // Sell all be default
  },
  // Meta Fields
  status: {
    type: String,
    enum: ["active", "disabled"],
    default: "active",
  },
  chain: {
    type: String,
    enum: ["solana"],
    default: "solana",
  },
  executionCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

tradeSchema.pre("validate", (next) => {
  const trade = this as any;
  if (trade.type === "buy") {
    // For buy rules, ensure sell-only fields are null
    trade.sellTargetX = undefined;
    trade.stopLossPercent = undefined;
    trade.trailingStop = undefined;
    trade.sellAmount = undefined;
  } else if (trade.type === "sell") {
    // For sell rules, ensure buy-only fields are null
    trade.maxSlippage = undefined;
    trade.autoSell = undefined;
    trade.liquidityCheck = undefined;
    trade.honeypotCheck = undefined;
    trade.buyTaxLimit = undefined;
    trade.sellTaxLimit = undefined;
  }
  next();
});

export const Trade = mongoose.model("Trade", tradeSchema);
