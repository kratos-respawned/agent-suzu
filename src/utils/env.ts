import { z } from "zod";
const envParser = z.object({
  BOT_TOKEN: z.string().min(1),
  AI_KEY: z.string().min(1),
  OWNER_ID: z.string().transform((val) => parseInt(val)),
  DB_URL: z.string().min(1),
  QSTASH_TOKEN: z.string().min(1)
});
const env = (() => {
  const parsedEnv = envParser.safeParse(process.env);
  if (!parsedEnv.success) {
    throw new Error(parsedEnv.error.message);
  }
  return parsedEnv.data;
})();

export { env };
