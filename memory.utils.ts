import { db } from "./redis";


export class MemoryUtils {
    public static async getPersonalityList() {
        const personalities = await db.keys("personality:*");
        return personalities;
    }
    public static async getCurrentPersonality() {
        const currentPersonality = await db.get("current-personality");
        if (!currentPersonality) {
            await this.setCurrentPersonality("assistant");
            return "assistant";
        }
        return currentPersonality;
    }
    public static async getCurrentPersonalityDescription(currentPersonality: string) {
        const currentPersonalityDescription = await db.get(
            `personality:${currentPersonality}`
        );
        return currentPersonalityDescription;
    }
    public static async setCurrentPersonality(personality: string) {
        await db.set("current-personality", personality);
        return personality;
    }
    // await db.set(knowledgeKey, knowledge);
    public static async addKnowledge(key: string, knowledge: string) {
        const currentPersonality = await this.getCurrentPersonality();
        const knowledgeKey = `${currentPersonality}:memory:${key
            .toLowerCase()
            .replace(/ /g, "-")}`;
        await db.set(knowledgeKey, knowledge);
        return { knowledgeKey, currentPersonality };
    }

    public static async deleteKnowledge(key: string) {
        const currentPersonality = await this.getCurrentPersonality();
        const possibleKeys = [`${currentPersonality}:memory:${key}`, `${currentPersonality}:memory:${key.toLowerCase().replace(/ /g, "-")}`];
        const deletedKeys = await Promise.all(possibleKeys.map(async (possibleKey) => {
            const keyExists = await db.exists(possibleKey);
            if (keyExists) {
                await db.del(possibleKey);
            }
            return possibleKey;
        }));
        return { deletedKeys, currentPersonality };
    }
    public static async clearConversation() {
        const currentPersonality = await this.getCurrentPersonality();
        console.log("clearing conversation");
        await this.deleteKeys(`${currentPersonality}:user-messages`);
        await db.set(`${currentPersonality}:reset`, "done");
        return { currentPersonality };
    }
    public static async resetModel() {
        const currentPersonality = await db.get("current-personality");
        await this.deleteKeys(`${currentPersonality}:user-messages`);
        await this.deleteKeys(`${currentPersonality}:memory:*`);
        await db.set(`${currentPersonality}:reset`, "done");
        return { currentPersonality };
    }
    public static async getMemoriesList() {
        const currentPersonality = await this.getCurrentPersonality();
        const keys = await db.keys(`${currentPersonality}:memory:*`);
        const memoryPromptPromise = keys.map(async (key) => {
            const memoryValue = await db.get(key);
            return { key, value: memoryValue };
        });
        const memoryPrompt = await Promise.all(memoryPromptPromise);
        return { memoryPrompt, currentPersonality };
    }

    public static async deleteKeys(pattern: string) {
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

}

