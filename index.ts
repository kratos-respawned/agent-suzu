import { logger } from "./ai/logger";
import { bot } from "./bot";
import { db } from "./redis";

bot.start({
  onStart: async (botInfo) => {
    const currentPersonality = await db.get("current-personality");
    await logger(
      `Bot started with username ${botInfo.username} and current personality ${currentPersonality}`
    );
  },
});
