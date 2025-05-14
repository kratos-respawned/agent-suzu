import { tool } from "ai";
import { z } from "zod";

export const dateTimeTool = tool({
  description: "Get the current Indian date and time",
  parameters: z.object({}),
  execute: async ({}) => ({
    date: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }),
});
