import { Client } from "@upstash/qstash"
import { env } from "./env"

export const queue = new Client({
    token: env.QSTASH_TOKEN,
})

