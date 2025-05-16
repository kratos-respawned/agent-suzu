import { generateText, tool } from "ai";
import { z } from "zod";
import { google } from "..";
import { db } from "../../redis";
import { logger } from "../logger";

export const outOfContext = tool({
  description:
    "Use this tool when you need some latest information you don't have access to, this tool will use web search to get the latest information.",
  parameters: z.object({
    prompt: z
      .string()
      .describe(
        "The prompt for the web search, make sure to make it descriptive and detailed to get the best results."
      ),
  }),
  execute: async ({ prompt }) => {
    const currentPersonality = await db.get("current-personality");
    logger(
      `${currentPersonality} invoked outOfContext tool with prompt ${prompt}`
    );
    try {
      const response = await generateText({
        model: google("gemini-2.5-pro-exp-03-25", {
          useSearchGrounding: true,
        }),
        maxRetries: 1,
        prompt: prompt,
      });
      return response.text;
    } catch (e: unknown) {
      try {
        const response = await generateText({
          model: google("gemini-2.0-flash-thinking-exp-01-21", {
            useSearchGrounding: true,
          }),
          maxRetries: 1,
          prompt: prompt,
        });
        return response.text;
      } catch (e: unknown) {
        logger(
          `${currentPersonality} error in outOfContext tool with prompt ${prompt} ${e}`
        );
        return "The tool failed to get the latest information. Please it report this issue so that it can be fixed";
      }
    }
  },
});
