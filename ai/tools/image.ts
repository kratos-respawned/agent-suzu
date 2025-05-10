import {
  tool,
  experimental_generateImage as generateImage,
  generateText,
} from "ai";
import z from "zod";
import { google } from "..";

export const createImage = tool({
  description:
    "Generate an image based on the user's prompt and request. Make sure to generate a high quality image.",
  parameters: z.object({
    prompt: z
      .string()
      .describe(
        "The prompt for the image to generate, make sure to make it descriptive and detailed to get the best results"
      ),
  }),
  execute: async ({ prompt }) => {
    return {
      success: false,
      message:
        "This tool is not available for now and is underdevelopment, please try again later",
    };
    const result = await generateText({
      model: google("gemini-2.0-flash-exp"),
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      prompt,
    });
    for (const file of result.files) {
      if (file.mimeType.startsWith("image/")) {
        // Upload the image to s3 bucket
        // return {
        //   success: true,
        //   message: `Image generated successfully`,
        //   image: file.base64,
        // };
      }
    }
  },
});
