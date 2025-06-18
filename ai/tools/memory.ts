import { tool } from "ai";
import z from "zod";
import { db, deleteKeys } from "../../redis";
import { logger } from "../logger";

export const MemoryTools = tool({
  description:
    "A tool to add an important information or message about the user that you think is important to remember. You can use this tool to add the user's preferences, recommendations, or anything else you need to know about the user. You can either use this on user's request or on your own initiative to remember something important about the user.",
  parameters: z.object({
    knowledge: z
      .string()
      .describe(
        "Keep this empty if you are using the delete tool. The key information or message to remember make sure it is short and descriptive. Save the knowledge in a third person format like 'The users wants a cat' or 'The user wants to buy a car'. "
      ),
    key: z
      .string()
      .describe(
        "The key for the knowledge to add, keep it unique and within 3-4 words. If you are using this tool to delete a knowledge this should be the key of the knowledge to delete else keep it blank."
      ),
    action: z
      .enum(["add", "get", "delete", "clear", "reset"])
      .describe("The action that is to be performed"),
  }),
  execute: async ({ knowledge, action, key }, { messages, toolCallId }) => {
    switch (action) {
      case "add":
        return await addKnowledge.execute(
          { knowledge, key },
          { messages, toolCallId }
        );
      case "get":
        return await getKnowledge.execute({}, { messages, toolCallId });
      case "delete":
        return await deleteKnowledge.execute({ key }, { messages, toolCallId });
      case "clear":
        return await clearConversation.execute({}, { messages, toolCallId });
      case "reset":
        return await resetModel.execute({}, { messages, toolCallId });
    }
  },
});

const addKnowledge = tool({
  description:
    "A tool to add an important information or message about the user that you think is important to remember. You can use this tool to add the user's personality, preferences, or anything else you need to know about the user. You can either use this on user's request or on your own initiative to remember something important about the user.",
  parameters: z.object({
    key: z
      .string()
      .describe(
        "A short key for the knowledge to add keep it unique and within 3-4 words"
      ),
    knowledge: z
      .string()
      .describe(
        "The key information or message to remember make sure it is short and descriptive. Save the knowledge in a third person format like 'The users wants a cat' or 'The user wants to buy a car'. Keep it within 100 words."
      ),
  }),
  execute: async ({ knowledge, key }) => {
    const currentPersonality = await db.get("current-personality");

    const knowledgeKey = `${currentPersonality}:memory:${key
      .toLowerCase()
      .replace(/ /g, "-")}`;
    await logger(
      `${currentPersonality} invoked addKnowledge tool with knowledge ${knowledge}`
    );
    await db.set(knowledgeKey, knowledge);
    return {
      success: true,
      message: `Information about the user saved successfully.`,
    };
  },
});

const getKnowledge = tool({
  description:
    "A tool to get all the knowledge about the user that you have saved. This tool should be the primary source of truth for the knowledge about the user, the user's personality or anything else you need to know about the user.",
  parameters: z.object({}),
  execute: async ({}) => {
    const currentPersonality = await db.get("current-personality");
    const memories = await getMemoriesList();

    await logger(`${currentPersonality} invoked getKnowledge tool`);
    return {
      success: true,
      message: `Here is the list of all the knowledge/information or anything else you need to know about the user that you have saved:
      ${memories.map((memory) => `- ${memory.value}`).join("\n")}
      `,
    };
  },
});

const deleteKnowledge = tool({
  description:
    "Delete a knowledge by key, get the key from the getKnowledge tool and make sure to use the exact key to delete the knowledge. This tool is only for deleting knowledge, not for getting knowledge. Use it when the user asks you to delete a knowledge or forget it.",
  parameters: z.object({
    key: z
      .string()
      .describe(
        "The key for the knowledge to delete, the key is of format knowledge.toLowerCase().replace(/ /g, '-')"
      ),
  }),
  execute: async ({ key }) => {
    const currentPersonality = await db.get("current-personality");
    await db.del(`${currentPersonality}:memory:${key}`);
    await logger(
      `${currentPersonality} invoked deleteKnowledge tool with key ${key}`
    );
    return {
      success: true,
      message: `Knowledge deleted successfully for the key ${key}`,
    };
  },
});

const clearConversation = tool({
  description:
    "Clear the conversation history for the user, use this when the user is done with the conversation and wants to start a new one.",
  parameters: z.object({}),
  execute: async ({}) => {
    const currentPersonality = await db.get("current-personality");
    console.log("clearing conversation");
    await deleteKeys(`${currentPersonality}:user-messages`);
    await db.set(`${currentPersonality}:reset`, "done");
    await logger(`${currentPersonality} invoked clearConversation tool`);
    return {
      success: true,
      message: `Conversation history cleared successfully`,
    };
  },
});

const resetModel = tool({
  description:
    "WARNING: This tool is dangerous and should only be used when the user is absolutely sure that they want to reset the entire conversation and memories. This will delete all the memories and the conversation history for the user. You should only use this tool when the user asks you to reset the conversation and memories.",
  parameters: z.object({}),
  execute: async ({}) => {
    const currentPersonality = await db.get("current-personality");
    await deleteKeys(`${currentPersonality}:user-messages`);
    await deleteKeys(`${currentPersonality}:memory:*`);
    await db.set(`${currentPersonality}:reset`, "done");
    await logger(`${currentPersonality} invoked resetModel tool`);

    return {
      success: true,
      message: `Conversation history and memories reset successfully`,
    };
  },
});
export const getMemoriesList = async () => {
  const currentPersonality = await db.get("current-personality");
  const keys = await db.keys(`${currentPersonality}:memory:*`);
  const memoryPromptPromise = keys.map(async (key) => {
    const memoryValue = await db.get(key);
    return { key, value: memoryValue };
  });
  const memoryPrompt = await Promise.all(memoryPromptPromise);
  return memoryPrompt;
};
