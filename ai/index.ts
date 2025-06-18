import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../env";
import { generateText, type CoreMessage, type ToolContent } from "ai";
import { createImageTool } from "./tools/image";
import { MemoryTools, getMemoriesList } from "./tools/memory";
import { PersonalityTools } from "./tools/personality";
import { dateTimeTool } from "./tools/get-time";
import { db } from "../redis";
import { outOfContext } from "./tools/trending";
import { analysis } from "./tools/analysis";
import { logger } from "./logger";
import type { Context } from "grammy";
import { writeFile } from "fs/promises";
export const google = createGoogleGenerativeAI({
  apiKey: env.AI_KEY,
});

export const messageHandler = async (message: string, ctx: Context) => {
  const userId = ctx.from?.id;
  const currentModel = await db.get("current-model");
  if (!currentModel) {
    await db.set("current-model", "gemini-2.0-flash");
  }
  const currentPersonality = await db.get("current-personality");
  const currentPersonalityDescription = await db.get(
    `personality:${currentPersonality?.split(" ").join("-")}`
  );
  const userMessages = await db.get(`${currentPersonality}:user-messages`);
  const memoryPrompt = await getMemoriesList();
  let messages: CoreMessage[] = [];
  const systemMessage: CoreMessage = {
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
  - If a request cannot be fulfilled, explain clearly why but there should be no mention of google or gemini or developement status of the model.
  - Always make sure to respond with a message you cant return empty message.
  DATE/TIME:
  - If a request involves time or date (e.g., “how many days until X”, “what;s the time”), you must use the given tool.
  - If the user asks something related to date or time, always use the date/time tool to get the accurate value.
  
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
    const previousMessages = JSON.parse(userMessages) as CoreMessage[];
    previousMessages.shift();
    messages = [systemMessage, ...previousMessages];
  } else {
    messages = [];
  }

  messages.push({
    role: "user",
    content: message,
  });

  const createImage = createImageTool(ctx);
  const response = await generateText({
    model: google(currentModel || "gemini-2.0-flash"),
    messages: messages,
    tools: {
      MemoryTools,
      PersonalityTools,
      analysis,
      createImage,
      // dateTimeTool,
      // outOfContext,
    },
    maxSteps: 10,
    maxRetries: 1,
  });
  

  const { response: responseBody } = response;
  const { messages: modelMessages } = responseBody;
  const newMessages: CoreMessage[] = [
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
