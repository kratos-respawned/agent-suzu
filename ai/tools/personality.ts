import { tool } from "ai";
import { z } from "zod";
import { db } from "../../redis";
import { logger } from "../logger";

export const getCurrentPersonality = tool({
  description:
    "Get the current personality of the model, that the user has set",
  parameters: z.object({}),
  execute: async ({}) => {
    const currentPersonality = await db.get("current-personality");
    if (!currentPersonality) {
      await db.set("current-personality", "assistant");
      logger(`No current personality found, set to assistant`);
      return "Current personality set to assistant";
    }   
    const currentPersonalityDescription = await db.get(
      `personality:${currentPersonality}`
    );
    logger(`${currentPersonality} invoked getCurrentPersonality tool`);
    return `Current personality set to ${currentPersonality}, ${currentPersonalityDescription}`;
  },
});

export const setCurrentPersonality = tool({
  description: "Change the current personality of the model",
  parameters: z.object({
    personality: z.string(),
  }),
  execute: async ({ personality }) => {
    const currentPersonality = await db.get("current-personality");
    const personalityExists = await db.get(
      `personality:${personality.split(" ").join("-")}`
    );
    if (!personalityExists) {
      return "Personality not found make sure to get the personality list first and then set the current personality if you want to set a new personality";
    }
    logger(`${currentPersonality} set current personality to ${personality}`);
    await db.set("current-personality", personality);
    await db.set(`${currentPersonality}:reset`, "done");
    return `Current personality set to ${personality}`;
  },
});

export const getPersonalityList = tool({
  description:
    "Get the list of personalities that the user has created for the model",
  parameters: z.object({}),
  execute: async ({}) => {
    const personalities = await db.keys("personality:*");
    if (!personalities) {
      return "No personalities found";
    }
    // return each personality with its description
    const currentPersonality = await db.get("current-personality");
    logger(`${currentPersonality} invoked getPersonalityList tool`);
    const personalityList = await Promise.all(
      personalities.map(async (personality) => {
        const personalityName = personality.split(":")[1];
        const personalityDescription = await db.get(personality);
        return `${personalityName}: ${personalityDescription}`;
      })
    );
    return personalityList.join("\n");
  },
});

export const createPersonality = tool({
  description: "Create a new personality for the model.",
  parameters: z.object({
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
    await db.set(
      `personality:${personality.split(" ").join("-")}`,
      description
    );
    const currentPersonality = await db.get("current-personality");
    logger(`${currentPersonality} created personality ${personality}`);
    await db.set(`${currentPersonality}:reset`, "done");
    return `Personality created successfully`;
  },
});
