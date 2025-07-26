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
const walletSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  telegramId: String,
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
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
  },
  tokenAddress: String,
  action: String,
  amountIn: {
    type: mongoose.Schema.Types.Double,
  },
  amountOut: {
    type: mongoose.Schema.Types.Double,
  },
  price: Number,
  status: String,
});

export const Trade = mongoose.model("Trade", tradeSchema);
