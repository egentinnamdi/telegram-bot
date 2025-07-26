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
});

export const Trade = mongoose.model("Trade", tradeSchema);
