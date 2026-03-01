import { tool } from "ai";
import { z } from "zod";

import { MemoryUtils } from "../../memory.utils.js";

import { db } from "../../redis.js";
import { logger } from "../../src/utils/logger.js";

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

  ) => {
    switch (action) {
      case "get":
        return await getCurrentPersonality();
      case "set":
        return await setCurrentPersonality({ personality });
      case "list":
        return await getPersonalityList();
      case "create":
        return await createPersonality({ personality, description });
      case "delete":
        return await deletePersonality({ personality });
    }
  },
});

const getCurrentPersonality = async () => {
  const currentPersonality = await MemoryUtils.getCurrentPersonality();
  const currentPersonalityDescription = await MemoryUtils.getCurrentPersonalityDescription(currentPersonality);
  await logger(`${currentPersonality} invoked getCurrentPersonality tool`);
  return {
    success: true,
    message: `Current personality set to ${currentPersonality}, ${currentPersonalityDescription}`,
  };
}
const setCurrentPersonality = async ({ personality }: { personality: string }) => {
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
}

const getPersonalityList = async () => {
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
}

const createPersonality = async ({ personality, description }: { personality: string, description: string }) => {
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
}
const deletePersonality = async ({ personality }: { personality: string }) => {
  await MemoryUtils.deleteKeys(`${personality}:reset`);
  await MemoryUtils.deleteKeys(`${personality}:user-messages`);
  await MemoryUtils.deleteKeys(`${personality}:memory:*`);
  await MemoryUtils.deleteKeys(`personality:${personality.split(" ").join("-")}`);
  return {
    success: true,
    message: `Personality deleted successfully`,
  };
}
