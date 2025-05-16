import { Bot, Context, type NextFunction } from "grammy";
import { env } from "./env";
import { messageHandler } from "./ai";
import { db, deleteKeys } from "./redis";
import { getMemoriesList } from "./ai/tools/memory";
import { getTime } from "./ai/tools/get-time";
import { logger } from "./ai/logger";

const bot = new Bot(env.BOT_TOKEN);
const middleWare = async (c: Context, next: NextFunction) => {
  if (c.message?.from.id !== env.OWNER_ID) {
    c.reply("You are not allowed to use the bot");
   await logger(`${c.message?.from.id}: ${c.message?.from.username} tried to use the bot`);
    return;
  }
  next();
};
bot.command("start", (ctx) => {
  ctx.reply(`Hii, ${ctx.from?.first_name}!`);
});
bot.use(middleWare).command("pro", async (ctx) => {
  await db.set("current-model", "gemini-2.5-pro-exp-03-25");
  ctx.reply("Model set to Pro");
});
bot.use(middleWare).command("flash", async (ctx) => {
  await db.set("current-model", "gemini-2.0-flash");
  ctx.reply("Model set to Flash");
});

bot.use(middleWare).command("personality", async (ctx) => {
  const personality = await db.get("current-personality");
  if (!personality) {
    ctx.reply("No personality set");
    return;
  }
  const personalityDescription = await db.get(
    `personality:${personality.split(" ").join("-")}`
  );
  ctx.reply(
    `Current personality: ${personality}\nDescription: ${personalityDescription}`
  );
});
bot.use(middleWare).command("listmemories", async (ctx) => {
  const memories = await getMemoriesList();
  ctx.reply(`Memories: ${memories.map((memory) => `- ${memory}`).join("\n")}`);
});
bot.use(middleWare).command("personalitylist", async (ctx) => {
  const personalities = await db.keys("personality:*");
  if (!personalities) {
    ctx.reply("No personalities found");
    return;
  }
  const personalityList = personalities.map((personality) => {
    const personalityName = personality.split(":")[1];
    return personalityName;
  });
  ctx.reply(`Personality List: \n ${personalityList.join("\n")}`);
});
bot.use(middleWare).command("flashpreview", async (ctx) => {
  await db.set("current-model", "gemini-2.5-flash-preview-04-17");
  ctx.reply("Model set to Flash Preview");
});
bot.use(middleWare).command("setpersonality", async (ctx) => {
  const message = ctx.message;
  if (!message) {
    ctx.reply("Please provide a personality to set");
    return;
  }
  const personality = message.text.split(" ")[1];
  if (!personality) {
    ctx.reply("Please provide a personality to set");
    return;
  }
  const personalityDescription = await db.get(`personality:${personality}`);
  if (!personalityDescription) {
    ctx.reply("Personality not found");
    return;
  }
  await db.set("current-personality", personality);
  ctx.reply(`Current personality set to ${personality}`);
});
bot.use(middleWare).command("clearconversation", async (ctx) => {
  const currentPersonality = await db.get("current-personality");
  if (!currentPersonality) {
    ctx.reply("No personality set");
    return;
  }
  await db.del(`${currentPersonality}:user-messages`);
  ctx.reply("Conversation cleared");
});
bot.use(middleWare).command("clearall", async (ctx) => {
  const currentPersonality = await db.get("current-personality");
  if (!currentPersonality) {
    ctx.reply("No personality set");
    return;
  }
  await db.del(`${currentPersonality}:user-messages`);
  await deleteKeys(`${currentPersonality}:memory:*`);
  ctx.reply("Conversation and memories cleared");
});
bot.use(middleWare).command("time", (ctx) => {
  const time = getTime();
  ctx.reply(time);
});
bot.api.setMyCommands([
  {
    command: "start",
    description: "Start the bot",
  },
  {
    command: "pro",
    description: "Set the model to Pro",
  },
  {
    command: "flash",
    description: "Set the model to Flash",
  },
  {
    command: "personality",
    description: "Get the current personality",
  },
  {
    command: "listmemories",
    description: "list the memories",
  },
  {
    command: "personalitylist",
    description: "Get the list of personalities",
  },
  {
    command: "flashpreview",
    description: "Set the model to Flash Preview",
  },
  {
    command: "setpersonality",
    description: "Set the current personality",
  },
  {
    command: "clearconversation",
    description: "Clear the conversation",
  },
  {
    command: "time",
    description: "Get the current server time",
  },
  {
    command: "clearall",
    description: "Clear the conversation and memories",
  },
]);
bot.use(middleWare).on("message", async (ctx) => {
  const message = ctx.message;
  const messageText = message.text;
  if (!messageText) {
    ctx.reply("Please provide a message to process");
    return;
  }
  const response = await messageHandler(messageText, ctx.from.id.toString());
  try {
    ctx.reply(response.text, { parse_mode: "Markdown" });
  } catch (e: unknown) {
    ctx.reply(response.text);
  }
  response.files.forEach((file) => {
    if (file.mimeType.startsWith("image/")) {
      ctx.replyWithPhoto(file.base64);
    }
  });
});

export { bot };
