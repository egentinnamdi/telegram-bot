import { Context } from "telegraf";
import { Wallet } from "../database/schema";

export async function checkWalletName(ctx: Context, walletName: string) {
  // Check if user already has a wallet with this name
  const walletWIthResponseName = await Wallet.findOne({
    $and: [{ telegramId: ctx.from?.id }, { walletName }],
  });

  if (walletWIthResponseName) {
    ctx.reply(
      `⚠️ You already have a wallet with the name ${walletName}, Use a different name`
    );
    return false;
  }
  return true;
}
