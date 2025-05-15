import { generateText, tool } from "ai";
import { z } from "zod";
import { google } from "..";

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
    const response = await generateText({
      model: google("gemini-2.0-flash-thinking-exp-01-21", {
        useSearchGrounding: true,
      }),
      prompt: prompt,
    });
    return response.text;
  },
});
