import type { EmbeddingResource, SemanticEmbeddingConfig } from "../../../../model/ports/resources";
import type { JournalSnippet } from "../../entities";
import type { JournalSearchRow } from "../dto/journal.dto";
import type { JournalIndex } from "../ports/journal-index";

/** Renders the stable snippet facts used as semantic embedding input. */
function semanticContent(snippet: Pick<JournalSnippet, "title" | "body" | "tags">): string {
  const tags = snippet.tags.length > 0 ? `tags: ${snippet.tags.join(",")}\n` : "";
  return `${snippet.title}\n${tags}\n${snippet.body}`.trim();
}

/** Calculates cosine similarity for two embedding vectors. */
function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  const length = Math.min(left.length, right.length);
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index]!;
    const rightValue = right[index]!;
    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Ranks recent indexed snippets while reusing or updating the physical
 * embedding cache exposed by the current Journal index.
 */
export async function rankSemanticSnippets(input: {
  index: JournalIndex;
  embeddings: EmbeddingResource;
  config: SemanticEmbeddingConfig;
  query: string;
  limit: number;
  candidateLimit?: number;
}): Promise<Array<JournalSearchRow & { score: number }>> {
  const candidateLimit = Math.max(1, Math.min(input.candidateLimit ?? 200, 500));
  const candidates = input.index.listRecentSnippets(candidateLimit);
  if (candidates.length === 0) return [];

  const queryVector = await input.embeddings.embedText({
    text: input.query,
    config: input.config,
  });
  const scored: Array<JournalSearchRow & { score: number }> = [];

  for (const snippet of candidates) {
    const content = semanticContent(snippet);
    const contentHash = await sha256Hex(content);
    const cacheKey = {
      id: snippet.id,
      provider: input.config.provider,
      model: input.config.model,
      contentHash,
    };
    let vector = input.index.readEmbedding(cacheKey);
    if (vector === null) {
      vector = await input.embeddings.embedText({ text: content, config: input.config });
      input.index.writeEmbedding({ ...cacheKey, vector });
    }

    const { body: _body, ...row } = snippet;
    scored.push({ ...row, score: cosineSimilarity(queryVector, vector) });
  }

  scored.sort((left, right) => right.score - left.score);
  return scored.slice(0, input.limit);
}
