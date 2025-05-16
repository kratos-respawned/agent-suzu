import { bot } from "../bot";

export const logger = (message: string) => {
  const chatId = process.env.LOG_CHANNEL_ID;
  if (!chatId) {
    console.log(message);
    return;
  }
  bot.api.sendMessage(chatId, message);
};
