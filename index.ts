import { env } from "./env";
import { bot } from "./bot";
import { db, deleteKeys } from "./redis";
//await deleteKeys(`user-messages`);
//await deleteKeys(`memory:*`);
console.log("Starting bot");
bot.start();

console.log("Bot started");
