import { Scenes } from "telegraf";
import { MyContext } from "../../../bot";

export const removeWallet = new Scenes.WizardScene<MyContext>(
  "removeWallet",
  async (ctx) => {
    console.log((ctx.callbackQuery as any).data);

    ctx.scene.leave();
  }
);
