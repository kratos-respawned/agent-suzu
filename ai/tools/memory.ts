import { tool } from "ai";
import z from "zod";
import { db, deleteKeys } from "../../redis";

export const saveMemory = tool({
  description:
    "Save an important information or message that the user tells you to remember",
  parameters: z.object({
    memory: z
      .string()
      .describe(
        "The key information or message to remember make sure it is short and descriptive. Save the memory in a third person format like 'The users wants a cat' or 'The user wants to buy a car'."
      ),
  }),
  execute: async ({ memory }) => {
    const key = `memory:${memory.toLowerCase().replace(/ /g, "-")}`;
    await db.set(key, memory);
    return {
      success: true,
      message: `Memory saved successfully for the key ${key}`,
    };
  },
});

export const getMemories = tool({
  description:
    "Get all the memories saved by the user, the key for each memory is of the format memory.toLowerCase().replace(/ /g, '-')",
  parameters: z.object({}),
  execute: async ({}) => {
    const memories = await db.keys("memory:*");
    return {
      success: true,
      message: `Here are all the keys for the memories saved: ${memories.join(
        ", "
      )}`,
    };
  },
});

export const deleteMemory = tool({
  description:
    "Delete a memory by key, get the key from the getMemories tool and make sure to use the exact key to delete the memory. This tool is only for deleting memories, not for getting memories. Use it when the user asks you to delete a memory or forget it.",
  parameters: z.object({
    key: z
      .string()
      .describe(
        "The key for the memory to delete, the key is of format memory.toLowerCase().replace(/ /g, '-')"
      ),
  }),
  execute: async ({ key }) => {
    await db.del(key);
    return {
      success: true,
      message: `Memory deleted successfully for the key ${key}`,
    };
  },
});

export const clearConversation = tool({
  description:
    "Clear the conversation history for the user, use this when the user is absolutely sure that they are done with the conversation and wants to start a new one.",
  parameters: z.object({}),
  execute: async ({}) => {
    await deleteKeys(`user-messages`);
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
    await deleteKeys(`user-messages`);
    await deleteKeys(`memory:*`);   
    return {
      success: true,
      message: `Conversation history and memories reset successfully`,
    };
  },
});
