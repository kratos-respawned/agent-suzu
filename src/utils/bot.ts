import { Bot, Context, GrammyError, type NextFunction } from "grammy";
import { env } from "./env.js";
import { google, messageHandler } from "../ai/index.js";
import { db, deleteKeys } from "./redis.js";
import { getMemoriesList, MemoryTools } from "../ai/tools/memory.js";
import { getTime } from "../ai/tools/get-time.js";
import { logger } from "./logger.js";
import { splitIntoChunks } from "./chukify.js";

const bot = new Bot(env.BOT_TOKEN);
const middleWare = async (c: Context, next: NextFunction) => {
  if (c.message?.from.id !== env.OWNER_ID) {
    c.reply("You are not allowed to use the bot");
    await logger(
      `${c.message?.from.id}: ${c.message?.from.username} tried to use the bot`
    );
    return;
  }
  next();
};
bot.command("start", (ctx) => {
  ctx.reply(`Hii, ${ctx.from?.first_name}!`);
});
bot.use(middleWare).command("pro", async (ctx) => {
  await db.set("current-model", "gemini-2.5-pro" satisfies Parameters<typeof google>[0]);
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
  ctx.reply(
    `Memories: ${memories.map((memory) => `- ${memory.value}`).join("\n")}`
  );
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
  await db.set("current-model", "gemini-2.5-flash" satisfies Parameters<typeof google>[0]);
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
bot.use(middleWare).on([":photo", ":sticker"], async (ctx) => {
  const photo = ctx.message?.photo?.at(0)?.file_id || ctx.message?.sticker;
  const caption = ctx.message?.caption;
  if (!photo) {
    await ctx.reply("Please provide a photo to process");
    return;
  }
  const file = await ctx.getFile();
  try {
    const response = await messageHandler(file, ctx, caption);
    const messageParts = splitIntoChunks(response.text, 4000);
    if (messageParts) {
      for (const part of messageParts) {
        ctx.reply(part);
      }
    } else {
      ctx.reply(response.text || "No response from bot");
    }
  } catch (err) {
    console.log(err)
    await logger(`Error occurred in bot: ${err instanceof Error ? err.message : "Unknown error"}`);
    ctx.reply("Error occurred while processing the message");
  }

  return;
})
bot.use(middleWare).on([":file"], async (ctx) => {
  if (ctx.message?.photo) {
    return;
  }
  console.dir(ctx.message, { depth: Infinity })
  const document = ctx.message?.document;
  const caption = ctx.message?.caption;
  if (!document) {
    return;
  }
  const mimeType = document.mime_type;

  const file = await ctx.getFile();
  try {
    const response = await messageHandler(file, ctx, caption, mimeType);
    const messageParts = splitIntoChunks(response.text, 4000);
    if (messageParts) {
      for (const part of messageParts) {
        ctx.reply(part);
      }
    } else {
      ctx.reply(response.text || "No response from bot");
    }
  } catch (err) {
    console.log(err)
    await logger(`Error occurred in bot: ${err instanceof Error ? err.message : "Unknown error"}`);
    ctx.reply("Error occurred while processing the message");
  }
})
bot.use(middleWare).on("message", async (ctx) => {
  const replyToMessage = ctx.message?.reply_to_message;
  const message = ctx.message;
  const messageText = message.text;
  if (!messageText) {
    ctx.reply("Please provide a message to process");
    return;
  }
  try {

    const response = await messageHandler(messageText, ctx, undefined, undefined, replyToMessage?.text);
    const messageParts = splitIntoChunks(response.text, 4000);
    if (messageParts) {
      for (const part of messageParts) {
        ctx.reply(part);
      }
    } else {
      ctx.reply(response.text || "No response from bot");
    }
  } catch (err) {
    console.log(err)
    await logger(`Error occurred in bot: ${err instanceof Error ? err.message : "Unknown error"}`);
    ctx.reply("Error occurred while processing the message");
  }
});
bot.catch(async (err) => {
  console.log(err);
  if (err.error instanceof GrammyError) {
    const { payload, description } = err.error;
    await logger(
      `Error occurred in bot: ${description} for the response :: ${JSON.stringify(
        (payload.text as string).slice(0, 200)
      )}`
    );
    return;
  }
  await logger(`Error occurred in bot: ${err.message}`);
});

export { bot };
