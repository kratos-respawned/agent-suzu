import { tool } from "ai";
import z from "zod";
import { db, deleteKeys } from "../../redis";
import { logger } from "../logger";
export const addKnowledge = tool({
  description:
    "A tool to add an important information or message about the user that you think is important to remember. You can use this tool to add the user's personality, preferences, or anything else you need to know about the user. You can either use this on user's request or on your own initiative to remember something important about the user.",
  parameters: z.object({
    knowledge: z
      .string()
      .describe(
        "The key information or message to remember make sure it is short and descriptive. Save the knowledge in a third person format like 'The users wants a cat' or 'The user wants to buy a car'."
      ),
  }),
  execute: async ({ knowledge }) => {
    const currentPersonality = await db.get("current-personality");

    const key = `${currentPersonality}:memory:${knowledge
      .toLowerCase()
      .replace(/ /g, "-")}`;
    logger(`${currentPersonality} invoked addKnowledge tool with knowledge ${knowledge}`);
    await db.set(key, knowledge);
    return {
      success: true,
      message: `Information about the user saved successfully.`,
    };
  },
});

export const getKnowledge = tool({
  description:
    "A tool to get all the knowledge about the user that you have saved. This tool should be the primary source of truth for the knowledge about the user, the user's personality or anything else you need to know about the user.",
  parameters: z.object({}),
  execute: async ({}) => {
    console.log("getting memories");
    const memories = await getMemoriesList();
    const currentPersonality = await db.get("current-personality");
    logger(`${currentPersonality} invoked getKnowledge tool`);
    return {
      success: true,
      message: `Here is the list of all the knowledge/information or anything else you need to know about the user that you have saved:
      ${memories.map((memory) => `- ${memory}`).join("\n")}
      `,
    };
  },
});

export const deleteKnowledge = tool({
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
    logger(`${currentPersonality} invoked deleteKnowledge tool with key ${key}`);
    return {
      success: true,
      message: `Knowledge deleted successfully for the key ${key}`,
    };
  },
});

export const clearConversation = tool({
  description:
    "Clear the conversation history for the user, use this when the user is done with the conversation and wants to start a new one.",
  parameters: z.object({}),
  execute: async ({}) => {
    const currentPersonality = await db.get("current-personality");
    console.log("clearing conversation");
    await deleteKeys(`${currentPersonality}:user-messages`);
    await db.set(`${currentPersonality}:reset`, "done");
    logger(`${currentPersonality} invoked clearConversation tool`);
    return {
      success: true,
      message: `Conversation history cleared successfully`,
    };
  },
});

export const resetModel = tool({
  description:
    "WARNING: This tool is dangerous and should only be used when the user is absolutely sure that they want to reset the entire conversation and memories. This will delete all the memories and the conversation history for the user. You should only use this tool when the user asks you to reset the conversation and memories.",
  parameters: z.object({}),
  execute: async ({}) => {
    const currentPersonality = await db.get("current-personality");
    await deleteKeys(`${currentPersonality}:user-messages`);
    await deleteKeys(`${currentPersonality}:memory:*`);
    await db.set(`${currentPersonality}:reset`, "done");
    logger(`${currentPersonality} invoked resetModel tool`);

    return {
      success: true,
      message: `Conversation history and memories reset successfully`,
    };
  },
});
export const getMemoriesList = async () => {
  const currentPersonality = await db.get("current-personality");
  const existingMemories = await db.keys(`${currentPersonality}:memory:*`);
  
  const memoryPromptPromise = existingMemories.map( async (memory) => {
    const memoryValue = await db.get(memory);
    return memoryValue;
  });

  const memoryPrompt = await Promise.all(memoryPromptPromise);
  return memoryPrompt;
};
