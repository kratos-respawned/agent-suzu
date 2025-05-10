import { tool } from "ai";
import { z } from "zod";

export const dateTimeTool = tool({
  description: "Get the current date and time",
  parameters: z.object({}),
  execute: async ({}) => ({
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
  }),
});
