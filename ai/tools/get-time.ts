import { tool } from "ai";
import { z } from "zod";
import { db } from "../../redis";
import { logger } from "../../src/utils/logger";

export const getTime = () => {
  const now = new Date();
  const dateOptions = {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  } as const;
  const timeOptions = {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  } as const;
  const date = now.toLocaleDateString("en-IN", dateOptions);
  const time = now.toLocaleTimeString("en-IN", timeOptions);
  const message = `The current date and time in Indian Standard Time is ${date} ${time}`;
  return message;
};
export const dateTimeTool = tool({
  description: "Get the current Indian date and time",
  inputSchema: z.object({}),
  execute: async ({ }) => {
    const currentPersonality = await db.get("current-personality");
    await logger(`${currentPersonality} invoked dateTimeTool`);
    return {
      success: true,
      message: getTime()
    };
  },
});
