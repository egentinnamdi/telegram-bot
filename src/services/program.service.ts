// Subscription service
// At this point, we are giving full control of the trade and wallet to the bot

import { InferSchemaType } from "mongoose";
import { connection, ws } from "../server.js";
import { walletSchema } from "../database/schema.js";
import { GetProgramAccountsConfig, PublicKey } from "@solana/web3.js";

export async function initiateSnipeProcess(
  wallet: InferSchemaType<typeof walletSchema>,
) {
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "programSubscribe",
    params: [
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
      {
        encoding: "base64",
        filters: [{ dataSize: 5 }],
      },
    ],
  };

  // Subscribe to the program
  ws.send(JSON.stringify(request));

  // Handle Subscription Notification
  ws.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      // if (data.method && data.method === "programNotification") {
      // const subscriptionId: number = data.params.subscription;
      // const unsubscribe = {
      //   jsonrpc: "2.0",
      //   id: 1,
      //   method: "programUnsubscribe",
      //   params: [subscriptionId],
      // };

      // Analyze Data and run through checks, then buy immediately
      console.log(data);
      // ws.send(JSON.stringify(unsubscribe));
      // }
    } catch (err) {
      console.log(err);
    }
  });
}
