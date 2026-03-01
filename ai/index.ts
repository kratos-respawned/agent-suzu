import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, stepCountIs, type ModelMessage } from "ai";

import { dateTimeTool } from "./tools/get-time.js";

import { MemoryTools } from "./tools/memory.js";
import { PersonalityTools } from "./tools/personality.js";


import type { Context } from "grammy";
import type { File } from "grammy/types";

import { env } from "../env.js";
import { MemoryUtils } from "../memory.utils.js";
import { db } from "../redis.js";
import { ReminderTool } from "./tools/reminder.js";
import { searchBookmarksTool } from "./tools/search.js";

export const google = createGoogleGenerativeAI({
  apiKey: env.AI_KEY,
});

export const messageHandler = async (message: string | File, ctx: Context, caption?: string, mimeType?: string, replyToMessage?: string) => {

  const currentModel = await db.get("current-model");
  if (!currentModel) {
    await db.set("current-model", "gemini-2.0-flash");
  }
  const currentPersonality = await MemoryUtils.getCurrentPersonality();
  const currentPersonalityDescription = await MemoryUtils.getCurrentPersonalityDescription(currentPersonality);
  const userMessages = await db.get(`${currentPersonality}:user-messages`);
  const { memoryPrompt } = await MemoryUtils.getMemoriesList();
  let messages: ModelMessage[] = [];
  const systemMessage: ModelMessage = {
    role: "system",
    content: `You are Suzuwuko, a ${currentPersonality}. ${currentPersonalityDescription}.
  You are a smart, adaptable personal assistant whose job is to understand the user's intent and respond helpfully, concisely, and clearly.
  ======================
  YOUR BEHAVIOR RULES:
  ======================
  GENERAL:
  - Always use the appropriate tool to answer a user request when applicable.
  - Do not fabricate tools, functions, or facts.
  - This is a very strict requirement,Never state that you are a bot or that you were created by Google. You are Suzuwuko, a personal assistant.
  - Never return the response with markdown or html tags unless it is a code or a link, this makes the response look ugly.
  - If a request cannot be fulfilled, explain clearly why but there should be no mention of google or gemini or developement status of the model.
  - Always make sure to respond with a message you cant return empty message.
  - If a request involves time or date (e.g., “how many days until X”, “what;s the time”), you must use the given tool.
  - If the user asks something related to date or time, always use the date/time tool to get the accurate value.
  - If the user asks something related to bookmarks, you must use the searchBookmarksTool to search the user's bookmarks.
  ============================
  HOW TO HANDLE USER KNOWLEDGE:
  ============================
  
  Use the tools provided to you to remember important things users tell you in chat. This acts as persistent memory.
  Use it when:
  - The user says, “remember this” or “can you save this?”
  - The user shares information about:
    • their location
    • preferences
    • habits
    • goals
    • relationships
    • emotions
    • personal struggles
    • opinions or recurring needs
  
  Example:
    • User: “I live in Tokyo” → Save: "The user lives in Tokyo."
    • User: “Remember that my favorite color is red” → Save: "The user's favorite color is red."
  You may also proactively save knowledge when it's obvious the user wants to be remembered.
  Use the provided tools to retrieve saved facts about the user.
  Use tools to remove the saved knowledge if the user wants to forget something.
  Do not guess—always retrieve stored knowledge when context is required.
  
  ===============================
  PERSONALITY SYSTEM RULES:
  ===============================
  
  - If the user requests a personality change, use the personality tools accordingly.
  - You may also switch personalities based on user intent, but always inform the user when doing so.
  - Use the tools provided to you to define new personas when asked.
  
  ${memoryPrompt.length > 0
        ? `\n============================\n Here are the some things you know about the user and some strict rules have agreed to follow:\n${memoryPrompt
          .map((memory) => `- ${memory.value}`)
          .join("\n")}`
        : ""
      }
  `,
  };

  if (userMessages) {
    const previousMessages = JSON.parse(userMessages) as ModelMessage[];
    previousMessages.shift();
    messages = [systemMessage, ...previousMessages];
  } else {
    messages = [systemMessage];
  }

  if (typeof message === "string") {
    messages.push(
      {
        content: replyToMessage ? `The user replied to the previous message: ${replyToMessage} and sent this message: ${message}` : message,
        role: "user",
      },
    );
  }
  //  else {
  //   const fileUrl = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${message.file_path}`;
  //   caption = caption || "no caption was provided by the user, use the image and previous messages context to generate a response";
  //   messages.push({
  //     role: "user",
  //     content: [
  //       mimeType ?
  //         {
  //           type: "file",
  //           mediaType: mimeType,
  //           data: fileUrl
  //         }
  //         : {
  //           image: fileUrl,
  //           type: "image",
  //         }
  //       , {
  //         text: caption,
  //         type: "text"
  //       }
  //     ],
  //   });
  // }
  // const createImage = createImageTool(ctx);
  if (ctx.chat?.id) {
    ctx.api.sendChatAction(ctx.chat?.id, "typing");
  }
  const reminder = ReminderTool(ctx);
  const response = await generateText({
    model: google(currentModel as Parameters<typeof google>[0]),
    messages: messages,
    tools: {
      MemoryTools,
      searchBookmarksTool,
      PersonalityTools,

      dateTimeTool,

      reminder
    },
    maxRetries: 1,
    stopWhen: stepCountIs(10)
  });



  const { response: responseBody } = response;
  const { messages: modelMessages } = responseBody;
  const newMessages: ModelMessage[] = [
    ...messages,
    ...modelMessages,
  ];
  const reset = await db.get(`${currentPersonality}:reset`);
  if (reset === "done") {
    await db.del(`${currentPersonality}:reset`);
    return response;
  }
  await db.set(
    `${currentPersonality}:user-messages`,
    JSON.stringify(newMessages)
  );
  return response;
};
