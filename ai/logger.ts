import { bot } from "../bot";

export const logger = async (message: string) => {
  const chatId = process.env.LOG_CHANNEL_ID;
  if (!chatId) {
    console.log(message);
    return;
  }
  console.log(message);
  await bot.api.sendMessage(Number(chatId), message);
};
