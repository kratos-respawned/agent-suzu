import Redis from "ioredis";
import { env } from "./env";
const db = new Redis(env.DB_URL);
export const knowledgeDB = new Redis(env.BOOKMARK_DB_URL)

export { db };
