import { bot } from "./bot.js";
import { splitIntoChunks } from "./chukify.js";

export const logger = async (message: string) => {
  const chatId = process.env.LOG_CHANNEL_ID;
  console.log(message);
  if (!chatId) {
    return;
  }
  const splitMessage = splitIntoChunks(message, 4000);
  for (const message of splitMessage) {
    await bot.api.sendMessage(Number(chatId), message);
  }
};
