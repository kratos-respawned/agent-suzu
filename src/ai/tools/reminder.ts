import { tool } from "ai";
import { z } from "zod";
import { queue } from "../../utils/qstash";
import type { Context } from "grammy";
import { logger } from "../logger";

export const ReminderTool = (ctx: Context) => tool({
    description: "A tool to set a reminder for the user",
    inputSchema: z.object({
        reminder: z.string().describe("A reminder message to set for the user with the context of the conversation, don't put any inverted commas in the beginning or end of the message."),
        time: z.string().describe("The time to set the reminder in format of ${number}${s,m,h,d}."),
    }),
    execute: async ({ reminder, time }) => {
        try {
            await logger(`ReminderTool invoked with reminder ${reminder} and time ${time}`)
            await queue.publish({
                url: `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
                delay: time as unknown as number,
                body: JSON.stringify({
                    chat_id: ctx.chatId,
                    text: `⏰ Reminder: ${reminder}`
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            })
            return {
                success: true,
            }
        } catch (e) {
            await logger(`Error occured in ReminderTool: ${e}`)
            return {
                success: false,
                message: `Error occured in ReminderTool ${e}`
            }
        }
    }
})
// TODO : A routine tool to send message in a specific time interval