import { generateText, tool } from "ai";
import { z } from "zod";
import { logger } from "../logger.js";
import { db } from "../../utils/redis.js";
import { google } from "../index.js";
import type { Context } from "grammy";

export const analysisTool = (ctx: Context) => tool({
  description:
    "A tool to help you with user's complex requirement that it beyond the scope of tools provided to you. This tool can use google search or read url content to further assist you, it also uses better model.",
  inputSchema: z.object({
    message: z
      .string()
      .describe(
        "A deep analysis of the user's message with the context of the conversation and the user's personality and preferences. Make sure to properly add the url or queries with proper context required to answer the user's query."
      ),
    analysisType: z.enum(["fast", "deep"]).describe("The type of analysis to perform, if it is a simple google search or any simple query that requires you to search use fast one else for deep analysis use deep one"),
    userMessage: z.string().describe("A simple message for the user till he is waiting for the analysis keep it short and simple like lemme check or any other creative message depending on the situation.")
  }),
  execute: async ({ message, analysisType, userMessage }) => {
    const currentPersonality = await db.get("current-personality");
    await logger(
      `${currentPersonality} invoked analysis tool with message ${message}`
    );
    await ctx.reply(userMessage);
    if (ctx.chat?.id) {
      await ctx.api.sendChatAction(ctx.chat?.id, "typing");
    }
    const response = await generateText({
      model: google(analysisType === "fast" ? "gemini-2.5-flash" : "gemini-2.5-pro"),
      prompt: message,
      tools: {
        google_search: google.tools.googleSearch({}),
        url_context: google.tools.urlContext({
        })
      }
    })
    return {
      success: true,
      message: response.text
    };
  },
});
