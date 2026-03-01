import { tool } from "ai";
import z from "zod";
import { MemoryUtils } from "../../memory.utils";
import { logger } from "../../src/utils/logger";

export const MemoryTools = tool({
  description:
    "A tool to add an important information or message about the user that you think is important to remember. You can use this tool to add the user's preferences, recommendations, or anything else you need to know about the user. You can either use this on user's request or on your own initiative to remember something important about the user. ",
  inputSchema: z.object({
    knowledge: z
      .string()
      .describe(
        "Keep this empty if you are using the delete tool. The key information or message to remember make sure it is short and descriptive. Save the knowledge in a third person format like 'The users wants a cat' or 'The user wants to buy a car'. "
      ),
    key: z
      .string()
      .describe(
        "key for the knowledge to add, keep it unique and within 3-4 words.when using this tool to delete a knowledge this should be the key of the knowledge to delete"
      ),
    action: z
      .enum(["add", "getAll", "delete", "clear", "reset"])
      .describe("The action that is to be performed, add is to add a new knowledge, get is to get all or list all the knowledge, delete is to delete a knowledge, clear is to clear the conversation history, reset is a dangerous tool to reset the model."),
  }),
  execute: async ({ knowledge, action, key }, { messages, toolCallId }) => {
    switch (action) {
      case "add":
        return await addKnowledge({ key, knowledge });
      case "getAll":
        return await getKnowledge();
      case "delete":
        return await deleteKnowledge({ key });
      case "clear":
        return await clearConversation();
      case "reset":
        return await resetModel();
    }
  },
});

const addKnowledge = async ({ key, knowledge }: { key: string, knowledge: string }) => {
  const { currentPersonality } = await MemoryUtils.addKnowledge(key, knowledge);
  await logger(
    `${currentPersonality} invoked addKnowledge tool with knowledge ${knowledge}`
  );
  return {
    success: true,
    message: `Information about the user saved successfully.`,
  };
}

const getKnowledge = async () => {
  const { memoryPrompt, currentPersonality } = await MemoryUtils.getMemoriesList();
  await logger(`${currentPersonality} invoked getKnowledge tool`);
  return {
    success: true,
    message: `Here is the list of all the knowledge/information or anything else you need to know about the user that you have saved in the format of key: value:
      ${memoryPrompt.map((memory) => `- ${memory.key.split(":")[2]}: ${memory.value}`).join("\n")}
      `,
  };
}

const deleteKnowledge = async ({ key }: { key: string }) => {
  const { deletedKeys, currentPersonality } = await MemoryUtils.deleteKnowledge(key);

  await logger(
    `${currentPersonality} invoked deleteKnowledge tool with key ${key}`
  );
  return {
    success: true,
    message: `Knowledge deleted successfully for the key ${key}`,
  };
}

const clearConversation = async () => {
  const { currentPersonality } = await MemoryUtils.clearConversation();
  await logger(`${currentPersonality} invoked clearConversation tool`);
  return {
    success: true,
    message: `Conversation history cleared successfully`,
  };
}

const resetModel = async () => {
  const { currentPersonality } = await MemoryUtils.resetModel();
  await logger(`${currentPersonality} invoked resetModel tool`);

  return {
    success: true,
    message: `Conversation history and memories reset successfully`,
  };
}
