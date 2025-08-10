import { Redis } from "ioredis";
import { env } from "./env.js";
const db = new Redis(env.DB_URL);
export async function deleteKeys(pattern: string) {
  let cursor = "0";

  do {
    const [nextCursor, keys] = await db.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      await db.del(...keys); // delete found keys
    }
  } while (cursor !== "0");

  console.log(`All ${pattern} keys deleted`);
}
export { db };
