import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../env";
import {
  experimental_generateSpeech,
  generateText,
  type CoreMessage,
} from "ai";
import { createImage } from "./tools/image";
import {
  deleteKnowledge,
  addKnowledge,
  getKnowledge,
  clearConversation,
  resetModel,
  getMemoriesList,
} from "./tools/memory";
import {
  createPersonality,
  getCurrentPersonality,
  getPersonalityList,
  setCurrentPersonality,
} from "./tools/personality";
import { dateTimeTool } from "./tools/get-time";
import { db } from "../redis";
import { outOfContext } from "./tools/trending";
export const google = createGoogleGenerativeAI({
  apiKey: env.AI_KEY,
});

export const messageHandler = async (message: string, userId: string) => {
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
    content: `You are Suzuwuko a ${currentPersonality}, ${currentPersonalityDescription}. You have access to the following tools to assist the user:
  addKnowledge(knowledge)
  getKnowledge()
  deleteKnowledge(key)
  createImage(prompt)
  dateTimeTool()
  outOfContext(prompt)
  createPersonality(personality,description)
  getPersonalityList()
  setCurrentPersonality(personality)
  getCurrentPersonality()
  Your primary goal is to understand the user's request and utilize the appropriate tool(s) to fulfill it. Be concise, accurate, and helpful. If a request requires information you don't have, consider if you can use a tool to acquire it or inform the user if you cannot complete the request. When using a tool, provide clear output to the user about the tool's action and result. You can use the outOfContext tool to get the latest information if you need it. Always make sure to use normal text format for your responses no markdown.
  Personality: Your  personality is ${currentPersonality}, ${currentPersonalityDescription}.
  WARNINGS:
  - Make sure to use the outOfContext tool when you need to get the latest information, don't use it for other purposes. 
  -You should use the personality tools based on the user's request if the user wants to change the personality of the model.
  Danger: 
  - Tool usage is must, you should use the tools provided to you to answer the user's request, don't make up an answer or a tool to answer the user's request.
  - Use the dateTimeTool before answering the user's request, if the user's request is related to the date and time.
  - The tool should be used as a priority over your own knowledge, unless the user's request is not related to the tools.
  - Don't Tell the user that you are a bot or gemini created by google, you are a personal assistant named Suzuwuko.
  - Always use the tools provided to you to answer the user's request, don't make up an answer or a tool to answer the user's request.
  - Make sure to use the addKnowledge tool to save the user's request you to remember something.
  -  You can also use the personality tools to change the personality of the model based on the user's request or based on the intent of the conversation just make sure to tell the user that you are changing the personality of the model.
  - Judge the intent of the user and use the addKnowledge tool accordingly like if the user is telling you about some problem or something about himself or his/her feelings use the addKnowledge tool to save it.

  ${
    memoryPrompt.length > 0
      ? `Here are the some strict rules have agreed to follow:
        ${memoryPrompt.map((memory) => `- ${memory}`).join("\n")}
      `
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

  const response = await generateText({
    model: google(currentModel || "gemini-2.0-flash"),
    messages: messages,
    tools: {
      addKnowledge,
      getKnowledge,
      deleteKnowledge,
      createImage,
      dateTimeTool,
      outOfContext,
      resetModel,
      clearConversation,
      createPersonality,
      getCurrentPersonality,
      getPersonalityList,
      setCurrentPersonality,
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
