// Websocket when user funds wallet
import { Wallet } from "../database/schema.js";
import { bot, ws } from "../server.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// Subscribe to account change socket to notify user of wallet fund success

export async function watchAccountChanges(publicKey: string) {
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "accountSubscribe",
    params: [
      publicKey,
      {
        encoding: "jsonParsed",
        commitment: "finalized",
      },
    ],
  };

  ws.send(JSON.stringify(request));

  ws.on("message", async (raw) => {
    try {
      const result = JSON.parse(raw.toString());
      if (result.method && result.method === "accountNotification") {
        const subscriptionId: number = result.params.subscription;
        const requestUnsubscribe = {
          jsonrpc: "2.0",
          id: 1,
          method: "accountUnsubscribe",
          params: [subscriptionId],
        };
        const data = result.params.result;
        const newBalance = data.value.lamports / LAMPORTS_PER_SOL;
        const wallet = await Wallet.findOneAndUpdate(
          { publicKey },
          { balance: newBalance },
        );

        // Send Notification to User after updating
        bot.telegram.sendMessage(
          wallet?.chatId as string,
          `✅ Your wallet has been successfully funded, your new wallet balance is ${newBalance} SOL 💵`,
        );

        // Unsubscribe from event
        ws.send(JSON.stringify(requestUnsubscribe));
        console.log("Websocket event unsubscribed");
      }
    } catch (err) {
      console.log(err);
    }
  });
}
