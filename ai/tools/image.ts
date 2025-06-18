import { tool, generateText } from "ai";
import { z } from "zod";
import { google } from "..";
import { db } from "../../redis";
import { logger } from "../logger";
import { GrammyError, InputFile, type Context } from "grammy";

export const createImageTool = (ctx: Context) =>
  tool({
    description:
      "Generate an image based on the user's prompt and request. Make sure to generate a high quality image.",
    parameters: z.object({
      prompt: z
        .string()
        .describe(
          "The prompt for the image to generate, make sure to make it is very descriptive and detailed to get the best results. Add things like the background, the objects, the colors, the style, the mood, the lighting, the composition, the perspective, the details, the emotions, the actions, the expressions, the poses, the clothing, the accessories, the hair, the makeup, the skin, the eyes."
        ),
    }),
    execute: async ({ prompt }) => {
      const currentPersonality = await db.get("current-personality");
      await logger(
        `${currentPersonality} invoked createImage tool with prompt ${prompt}`
      );

      try {
        const result = await generateText({
          model: google("gemini-2.0-flash-exp"),
          providerOptions: {
            google: { responseModalities: ["TEXT", "IMAGE"] },
          },
          prompt,
        });

        for (const file of result.files) {
          if (file.mimeType.startsWith("image/")) {
            // await writeFile(
            //   `${currentPersonality}-${Date.now()}.png`,
            //   file.base64
            // );
            const buffer = file.uint8Array;
            await ctx.replyWithPhoto(new InputFile(buffer));
          }
        }

        return {
          success: true,
          message: "Image generated and sent to the user successfully",
        };
      } catch (error) {
        if (error instanceof GrammyError) {
          return {
            success: true,
            message:
              "Image generated and but failed to send to the user, the file is saved in the current directory",
          };
        }
        await logger(
          `${currentPersonality} createImage tool failed with error: ${error}`
        );
        return {
          success: false,
          message: "Failed to generate image. Please try again.",
        };
      }
    },
  });
