import { Bot } from "grammy";
import { env } from "./env";
import { messageHandler } from "./ai";

const bot = new Bot(env.BOT_TOKEN);
bot.command("start", (ctx) => {
  ctx.reply(`Hii, ${ctx.from?.id}!`);
});
bot.on("message", async (ctx) => {
  const message = ctx.message;
  if (ctx.from.id !== env.OWNER_ID) {
    ctx.reply("You are not authorized to use this bot");
    return;
  }
  const messageText = message.text;
  if (!messageText) {
    ctx.reply("Please provide a message to process");
    return;
  }
  const response = await messageHandler(messageText, ctx.from.id.toString());
  console.log("response", response);
  console.log("text", response.text);
  ctx.reply(response.text);
  response.files.forEach((file) => {
    if (file.mimeType.startsWith("image/")) {
      ctx.replyWithPhoto(file.base64);
    }
  });
});
export { bot };
