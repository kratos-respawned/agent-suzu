

import { MemoryUtils } from "./memory.utils";
import { bot } from "./src/utils/bot";
import { logger } from "./src/utils/logger";

bot.start({
  onStart: async (botInfo) => {
    const currentPersonality = await MemoryUtils.getCurrentPersonality();
    await logger(
      `Bot started with username ${botInfo.username} and current personality ${currentPersonality}`
    );
  },
});
