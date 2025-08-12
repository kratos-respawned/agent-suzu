export function splitIntoChunks(text: string, maxLen: number = 4000): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+[\])'"`’”]*|.+/g) || [];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        // If adding this sentence would exceed the max length, start a new chunk
        if ((currentChunk + sentence).length > maxLen) {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = "";
            }
            // If the sentence itself is longer than maxLen, split it forcibly
            if (sentence.length > maxLen) {
                for (let i = 0; i < sentence.length; i += maxLen) {
                    chunks.push(sentence.slice(i, i + maxLen));
                }
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    return chunks;
}