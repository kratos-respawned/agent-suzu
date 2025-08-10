import { tool } from "ai";
import { z } from "zod";
import { db, deleteKeys } from "../../utils/redis.js";
import { logger } from "../logger.js";

export const PersonalityTools = tool({
  description:
    "A tool to get the current personality of the model, set the current personality of the model, get the list of personalities that the user has created for the model, and create a new personality for the model and delete a personality for the model.",
  inputSchema: z.object({
    personality: z.string().describe("The name of the personality"),
    description: z
      .string()
      .describe(
        "The description of the personality if you are creating a new personality else leave it blank"
      ),
    action: z
      .enum(["get", "set", "list", "create", "delete"])
      .describe("The personality action that is to be performed"),
  }),
  execute: async (
    { personality, description, action },
    { toolCallId, messages }
  ) => {
    switch (action) {
      case "get":
        return getCurrentPersonality.execute && await getCurrentPersonality.execute(
          {},
          { toolCallId, messages }
        );
      case "set":
        return setCurrentPersonality.execute && await setCurrentPersonality.execute(
          { personality },
          { toolCallId, messages }
        );
      case "list":
        return getPersonalityList.execute && await getPersonalityList.execute({}, { toolCallId, messages });
      case "create":
        return createPersonality.execute && await createPersonality.execute(
          { personality, description },
          { toolCallId, messages }
        );
      case "delete":
        return deletePersonality.execute && await deletePersonality.execute(
          { personality },
          { toolCallId, messages }
        );
    }
  },
});

const getCurrentPersonality = tool({
  description:
    "Get the current personality of the model, that the user has set",
  inputSchema: z.object({}),
  execute: async ({ }) => {
    const currentPersonality = await db.get("current-personality");
    if (!currentPersonality) {
      await db.set("current-personality", "assistant");
      await logger(`No current personality found, set to assistant`);
      return {
        success: true,
        message: "Current personality set to assistant",
      };
    }
    const currentPersonalityDescription = await db.get(
      `personality:${currentPersonality}`
    );
    await logger(`${currentPersonality} invoked getCurrentPersonality tool`);
    return {
      success: true,
      message: `Current personality set to ${currentPersonality}, ${currentPersonalityDescription}`,
    };
  },
});

const setCurrentPersonality = tool({
  description: "Change the current personality of the model",
  inputSchema: z.object({
    personality: z.string(),
  }),
  execute: async ({ personality }) => {
    const currentPersonality = await db.get("current-personality");
    const personalityExists = await db.get(
      `personality:${personality.split(" ").join("-")}`
    );
    if (!personalityExists) {
      return {
        success: false,
        message:
          "Personality not found make sure to get the personality list first and then set the current personality if you want to set a new personality",
      };
    }
    await logger(
      `${currentPersonality} set current personality to ${personality}`
    );
    await db.set("current-personality", personality);
    await db.set(`${currentPersonality}:reset`, "done");
    return {
      success: true,
      message: `Current personality set to ${personality}`,
    };
  },
});

const getPersonalityList = tool({
  description:
    "Get the list of personalities that the user has created for the model",
  inputSchema: z.object({}),
  execute: async ({ }) => {
    const personalities = await db.keys("personality:*");
    if (!personalities) {
      return {
        success: true,
        message: "No personalities found",
      };
    }
    // return each personality with its description
    const currentPersonality = await db.get("current-personality");
    await logger(`${currentPersonality} invoked getPersonalityList tool`);
    const personalityList = await Promise.all(
      personalities.map(async (personality) => {
        const personalityName = personality.split(":")[1];
        const personalityDescription = await db.get(personality);
        return `${personalityName}: ${personalityDescription}`;
      })
    );
    return {
      success: true,
      message: personalityList.join("\n"),
    };
  },
});

const createPersonality = tool({
  description: "Create a new personality for the model.",
  inputSchema: z.object({
    personality: z
      .string()
      .describe(
        "The personality of the model keep it one word or two words and in normal text format"
      ),
    description: z
      .string()
      .describe(
        "The description of the personality in very detailed format to make it more accurate and helpful"
      ),
  }),
  execute: async ({ personality, description }) => {
    const personalityName = personality.toLowerCase().split(" ").join("-");
    const existingPersonality = await db.get(`personality:${personalityName}`);
    if (existingPersonality) {
      return {
        success: false,
        message:
          "Personality already exists, if you want to change the description of the personality use the set personality tool",
      };
    }
    await db.set(`personality:${personalityName}`, description);
    const currentPersonality = await db.get("current-personality");
    await logger(`${currentPersonality} created personality ${personality}`);
    await db.set(`${currentPersonality}:reset`, "done");
    return {
      success: true,
      message: `Personality created successfully`,
    };
  },
});

const deletePersonality = tool({
  description: "Delete a personality for the model.",
  inputSchema: z.object({
    personality: z.string(),
  }),
  execute: async ({ personality }) => {
    await deleteKeys(`${personality}:reset`);
    await deleteKeys(`${personality}:user-messages`);
    await deleteKeys(`${personality}:memory:*`);
    await deleteKeys(`personality:${personality.split(" ").join("-")}`);
    return {
      success: true,
      message: `Personality deleted successfully`,
    };
  },
});
