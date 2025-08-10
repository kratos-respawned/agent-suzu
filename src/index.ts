import { webhookCallback } from "grammy";
import { bot } from "./utils/bot.js";
import { Hono } from 'hono'
const app = new Hono()
const welcomeStrings = [
    'Hello ',
    'To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/hono',
]
app.get('/', async (c) => {
    return c.text(welcomeStrings.join('\n\n'))
})
app.post(`/${bot.token}`, (c) => {
    console.log(c.req.raw.body)
    return webhookCallback(bot, "hono")(c)
})
export default app

