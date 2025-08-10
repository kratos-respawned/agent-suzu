import { webhookCallback } from "grammy";
import { bot } from "./utils/bot.js";

import { Hono } from 'hono'

const app = new Hono()
const welcomeStrings = [
    'Hello Hono!',
    'To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/hono',
]

app.get('/', (c) => {
    return c.text(welcomeStrings.join('\n\n'))
})
app.post(`/${bot.token}`, webhookCallback(bot, "hono"))
export default app

