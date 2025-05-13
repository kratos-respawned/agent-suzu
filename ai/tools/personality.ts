import { tool } from "ai";
import { z } from "zod";
import { db } from "../../redis";

export const getCurrentPersonality = tool({
  description:
    "Get the current personality of the model, that the user has set",
  parameters: z.object({}),
  execute: async ({}) => {
    const currentPersonality = await db.get("current-personality");
    if (!currentPersonality) {
      await db.set("current-personality", "assistant");
      return "Current personality set to assistant";
    }   
    const currentPersonalityDescription = await db.get(
      `personality:${currentPersonality}`
    );
    return `Current personality set to ${currentPersonality}, ${currentPersonalityDescription}`;
  },
});

export const setCurrentPersonality = tool({
  description: "Set the current personality of the model",
  parameters: z.object({
    personality: z.string(),
  }),
  execute: async ({ personality }) => {
    const personalityExists = await db.get(
      `personality:${personality.split(" ").join("-")}`
    );
    if (!personalityExists) {
      return "Personality not found make sure to get the personality list first and then set the current personality if you want to set a new personality";
    }
    await db.set("current-personality", personality);
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
    return personalities.map((personality) => {
      const personalityName = personality.split(":")[1];
      return personalityName;
    });
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
    return `Personality created successfully`;
  },
});
