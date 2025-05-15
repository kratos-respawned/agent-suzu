import { tool } from "ai";
import { z } from "zod";

export const analysis = tool({
  description:
    "A strictly must use tool to use before every response. This tool will analyze the user's message and return a summary of the user's intent.",
  parameters: z.object({
    message: z
      .string()
      .describe(
        "A deep analysis of the user's message with the context of the conversation and the user's personality and preferences."
      ),
  }),
  execute: async ({ message }) => {
    return message;
  },
});
