import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { z } from "zod";
import { logger } from "../logger.js";
import { db } from "../../utils/redis.js";
import { google } from "../index.js";
import type { Context } from "grammy";
type fileProcessor = {
  filePath: string,
  mimeType: string,
  image: boolean,
}
export const analysisTool = (ctx: Context, fileProcessor?: fileProcessor) => tool({
  description:
    "A tool to help you with user's complex requirement that it beyond the scope of tools provided to you. This tool can use google search or read url content to further assist you, it also uses better model.",
  inputSchema: z.object({
    message: z
      .string()
      .describe(
        "A deep analysis of the user's message with the context of the conversation and the user's personality and preferences. Make sure to properly add the url or queries with proper context required to answer the user's query and phrase the message as a command to someone else e.g. You have to perform the analysis and return the response in the same message. When the user sends a file or image you don't need to give any context to the file or image, just generate a command that can be used to analyze the file or image."
      ),
    analysisType: z.enum(["fast", "deep"]).describe("The type of analysis to perform, if it is a simple google search or any simple query that requires you to search use fast one else for deep analysis use deep one"),
    userMessage: z.string().describe("A simple message for the user till he is waiting for the analysis keep it short and simple like lemme check or any other creative message depending on the situation."),
  }),
  execute: async ({ message, analysisType, userMessage }) => {
    const currentPersonality = await db.get("current-personality");
    await logger(
      `${currentPersonality} invoked analysis tool with message ${message} with analysis type ${analysisType}`
    );
    await ctx.reply(userMessage);
    if (ctx.chat?.id) {
      await ctx.api.sendChatAction(ctx.chat?.id, "typing");
    }
    const messages: ModelMessage[] = [
      {
        role: "system",
        content: "You are a helpful assistant do whatever the user asks you to do and make sure to always return the response in plain text and not in markdown or html tags, Never return any code snippet or any code block unless the user explicitly asks for it."
      }]
    if (fileProcessor) {
      fileProcessor.image ?
        messages.push({
          role: "user",
          content: [{
            image: fileProcessor.filePath,
            type: "image"
          }, {
            text: message,
            type: "text"
          }]
        }) :
        messages.push({
          role: "user",
          content: [{
            type: "file",
            mediaType: fileProcessor.mimeType,
            data: fileProcessor.filePath
          }, {
            text: message,
            type: "text"
          }]
        })
    }
    else {
      messages.push({
        role: "user",
        content: message
      })
    }
    try {

      const response = await generateText({
        model: google(analysisType === "fast" ? "gemini-2.5-flash" : "gemini-2.5-pro"),
        stopWhen: stepCountIs(10),
        messages: messages,
        tools: {
          google_search: google.tools.googleSearch({}),
          url_context: google.tools.urlContext({
          })
        }
      })
      await logger(`here is the response from the analysis tool: ${response.text}`)
      return {
        success: true,
        message: response.text
      };
    } catch (err) {
      await logger(`Error occurred in analysis tool: ${err instanceof Error ? err.message : "Unknown error"}`);
      return {
        success: false,
        message: "Error occurred while processing the message"
      };
    }
  },
});
