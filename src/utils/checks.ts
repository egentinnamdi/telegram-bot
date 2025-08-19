import base58 from "bs58";
import { response } from "express";
import nacl from "tweetnacl";

const BASE_URL = "https://api.rugcheck.xyz/v1";

export async function signInToRugCheck({
  publicKey,
  privateKey,
}: {
  publicKey: string;
  privateKey: string;
}) {
  const messageText = "Login to RugCHeck";
  const messageBytes = new TextEncoder().encode(messageText);

  //   Decode private key into Uint8 Array
  const secretKey = base58.decode(privateKey);

  // Sign with user privatekey
  const signatureBytes = nacl.sign.detached(messageBytes, secretKey);

  const payload = {
    message: {
      message: messageText,
      publicKey: publicKey,
      timestamp: Date.now(),
    },
    signature: {
      data: Array.from(signatureBytes),
      type: "ed25519",
    },
    wallet: publicKey,
  };

  const response = await fetch(`${BASE_URL}/auth/login/solana`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const { token } = await response.json();
  return token;
}

export async function getAndAnalyzeDetailedTokenReport(tokenAddress: string) {
  const response = await fetch(`${BASE_URL}/tokens/${tokenAddress}/report`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const report = await response.json();
  console.log(report);
}
