import { embed, tool } from "ai"
import Redis from "ioredis"
import { z } from "zod"
import { google } from ".."
import { env } from "../../env"





const VECTOR_DIM = 768
const redis = new Redis(env.BOOKMARK_DB_URL)

function toFloat32Buffer(arr: number[]): Buffer {
    return Buffer.from(new Float32Array(arr).buffer)
}

function parseSearchResults(raw: any[]): { id: string; resolvedUrls?: string; author: string; cleanText: string; score: number }[] {

    const results = []
    for (let i = 1; i < raw.length; i += 2) {
        const key = raw[i] as string
        const fields = raw[i + 1] as string[]
        const map: Record<string, string> = {}
        for (let j = 0; j < fields.length; j += 2) {
            map[fields[j]!] = fields[j + 1]!
        }
        const resolvedUrls = map.resolvedUrls && map.resolvedUrls !== "null" ? map.resolvedUrls : undefined;
        results.push({
            id: key.replace("tweet:", ""),
            ...(resolvedUrls ? { resolvedUrls } : {}),
            author: map.authorUsername || "",
            cleanText: (map.cleanText + (resolvedUrls ? " " + resolvedUrls : "")).trim(),
            score: 1 - parseFloat(map.vector_score || "0"),
        })

    }

    return results
}

async function multiSearchBookmarks(queries: string[], topK = 3) {
    await redis.connect()
    const allResults = (await Promise.all(
        queries.map((q) => searchBookmarks(q, topK))
    )).flat();

    const seen = new Map<string, (typeof allResults)[number]>();
    for (const r of allResults) {
        const key = r.id;
        const existing = seen.get(key);
        if (!existing || r.score < existing.score) {
            seen.set(key, r);
        }
    }
    redis.disconnect()
    return [...seen.values()]
        .sort((a, b) => b.score - a.score).slice(0, topK);
}

async function searchBookmarks(query: string, topK = 5) {
    const embeddingModel = google.embedding("gemini-embedding-001")
    const { embedding } = await embed({
        model: embeddingModel,
        value: query,
        providerOptions: { google: { outputDimensionality: VECTOR_DIM } },
    })

    const raw = await redis.call(
        "FT.SEARCH", "tweets_idx",
        "*=>[KNN $K @embedding $BLOB AS vector_score]",
        "PARAMS", "4", "K", String(topK), "BLOB", toFloat32Buffer(embedding),
        "SORTBY", "vector_score",
        "RETURN", "4", "resolvedUrls", "authorUsername", "cleanText", "vector_score",
        "DIALECT", "2"
    ) as any[]

    return parseSearchResults(raw)
}

export const searchBookmarksTool = tool({
    description: "A tool to search the user's Twitter/X bookmarks by semantic similarity.",
    inputSchema: z.object({
        queries: z.array(z.string()).describe("Contextual queries and keywords to search for relevant bookmarks maximum 5, don't put any inverted commas in the beginning or end of the queries.").min(2).max(5),
        topK: z.number().max(5).min(1).optional().default(5),
    }),
    execute: async ({ queries, topK }) => multiSearchBookmarks(queries, topK)
})
// const { text } = await generateText({
//     model: google("gemini-2.5-flash"),
//     system: `You answer questions using the provided bookmark context.
// Analyze ALL returned results carefully — even partial matches or related topics are valuable.
// A result doesn't need to match the exact query terms to be relevant; conceptually related results count.
// If absolutely nothing is even tangentially related, say "I couldn't find anything relevant in your bookmarks."
// Always cite the author (@username) and including the the bookmark URL is must if available.`,
//     tools: {
//         searchBookmarks: tool({
//             description: "Search the user's Twitter/X bookmarks by semantic similarity.",
//             inputSchema: z.object({
//                 queries: z.array(z.string()).describe("Contextual queries and keywords to search for relevant bookmarks maximum 5").min(2).max(5),
//                 topK: z.number().max(5).min(1).optional().default(5),
//             }),
//             execute: async ({ queries, topK }) => multiSearchBookmarks(queries, topK)
//         })
//     },
//     stopWhen: stepCountIs(3),
//     prompt: "any bookmarks related to postGIS or spatial data"
// })

