import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { z } from "zod";
import { logger } from "../../utils/logger.js";
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
        "Rephrase the user's message into a clear instruction for the assistant. **Critically, every single prompt you generate MUST begin with the exact phrase: `[Tool-Call-Required]` followed by a space.** This is mandatory prefix, add the user's rephrased request after that.When the user sends a file or image you don't need to give any context to the file or image, just generate a command that can be used to analyze the file or image."
      )
    // .describe(
    //   "A deep analysis of the user's message with the context of the conversation and the user's personality and preferences. Make sure to properly add the url or queries with proper context required to answer the user's query and phrase the message as a command to someone else e.g. You have to perform the analysis and return the response in the same message. When the user sends a file or image you don't need to give any context to the file or image, just generate a command that can be used to analyze the file or image."
    // )
    ,
    analysisType: z.enum(["fast", "deep"]).describe("The type of analysis to perform, if it is a simple google search or any simple query that requires you to search use fast one else for deep analysis use deep one"),
    userMessage: z.string().describe("A simple message for the user till he is waiting for the analysis keep it short and simple like lemme check or any other creative message depending on the situation."),
  }),
  execute: async ({ message, analysisType, userMessage }) => {
    message = message.replace("[Tool-Call-Required]", "")
    message = '[Tool-Call-Required] ' + message
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
        content: `You are a powerful AI assistant equipped with a set of tools. Your behavior is governed by two primary rules:

Tool-Use Command: Your highest priority is to look for the special command [Tool-Call-Required] at the beginning of a prompt. If you see this command, you MUST use your available tools (like Google Search or a URL reader) to find the information needed to fulfill the rest of the prompt.

Output Formatting: Always return your final response in plain text. Do not use markdown, HTML, or code blocks unless the user explicitly asks you for them.

Your primary function is to act on the [Tool-Call-Required] command. Do not apologize for using tools or mention that you are doing so; simply process the request and provide the answer.
        `
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
      await Bun.write("response.json", JSON.stringify(response, null, 2))
      await logger(`here is the response from the analysis tool: ${response.text}`)
      return {
        success: true,
        message: response.text
      };
    } catch (err) {
      await logger(`Error occurred in analysis tool: ${err instanceof Error ? err.message : "Unknown error"}`);
      return {
        success: false,
        message: `Error occurred while processing the message: ${err instanceof Error ? err.message : "Unknown error"}`
      };
    }
  },
});
