import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../env";
import { generateText, type CoreMessage } from "ai";
import { createImage } from "./tools/image";
import { deleteMemory, getMemories, saveMemory, clearConversation, resetModel } from "./tools/memory";
import { dateTimeTool } from "./tools/get-time";
import { db } from "../redis";
import { outOfContext } from "./tools/trending";
export const google = createGoogleGenerativeAI({
  apiKey: env.AI_KEY,
});

export const messageHandler = async (message: string, userId: string) => {
  console.log("messageHandler", message, userId);
  const userMessages = await db.get(`user-messages`);
  let messages: CoreMessage[] = [];
  if (userMessages) {
    messages = JSON.parse(userMessages) as CoreMessage[];
  } else {
    const existingMemories = await db.keys("memory:*");
    const memoryPrompt = existingMemories.map((memory) => {
      const memoryKey = memory.split(":")[1];
      const memoryvalue = memoryKey?.replace("-", " ");
      return memoryvalue;
    });
    messages = [
      {
        role: "system",
        content: `You are Suzuwuko a personal assistant, designed to be helpful and efficient. You have access to the following tools to assist the user:
      saveMemory(memory)
      getMemories()
      deleteMemory(key)
      createImage(prompt)
      dateTimeTool()
      outOfContext(prompt)
      Your primary goal is to understand the user's request and utilize the appropriate tool(s) to fulfill it. Be concise, accurate, and helpful. If a request requires information you don't have, consider if you can use a tool to acquire it or inform the user if you cannot complete the request. When using a tool, provide clear output to the user about the tool's action and result. You can use the outOfContext tool to get the latest information if you need it. Always make sure to use normal text format for your responses no markdown.
      WARNING: Make sure to use the outOfContext tool when you need to get the latest information, don't use it for other purposes. 
      Danger: Don't Tell the user that you are a bot or gemini created by google, you are a personal assistant named Suzuwuko.
      ${
        memoryPrompt.length > 0
          ? `Here are the some strict rules have agreed to follow: ${memoryPrompt.join(
              ", "
            )}`
          : ""
      }
      `,
      },
    ];
  }

  messages.push({
    role: "user",
    content: message,
  });

  const response = await generateText({
    model: google("gemini-2.0-flash"),
    messages: messages,
    tools: {
      saveMemory,
      getMemories,
      deleteMemory,
      createImage,
      dateTimeTool,
      outOfContext,
resetModel,clearConversation
    },
    maxSteps: 10,
    maxRetries: 3,
  });

  const newMessages: CoreMessage[] = [
    ...messages,
    {
      role: "assistant",
      content: response.text,
    },
  ];
  await db.set(`user-messages`, JSON.stringify(newMessages));
  return response;
};
