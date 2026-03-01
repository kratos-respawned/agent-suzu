import Redis from "ioredis";
import { env } from "./env";
const db = new Redis(env.DB_URL);

export { db };
