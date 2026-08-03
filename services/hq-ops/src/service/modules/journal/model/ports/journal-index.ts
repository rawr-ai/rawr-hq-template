import type { JournalSearchRow } from "../dto/journal.dto";
import type { JournalSnippet } from "../entities";

/** Identity of one cached semantic embedding in the derived Journal index. */
export type JournalEmbeddingCacheKey = {
  id: string;
  provider: "openai" | "voyage";
  model: string;
  contentHash: string;
};

/** Cache write admitted by the derived Journal index. */
export type JournalEmbeddingCacheWrite = JournalEmbeddingCacheKey & {
  vector: Float32Array;
};

/** Physical operations available while one migration-ready Journal index is open. */
export type JournalIndex = {
  upsertSnippet(snippet: JournalSnippet): void;
  tailSnippets(limit: number): JournalSearchRow[];
  searchFts(query: string, limit: number): JournalSearchRow[];
  listRecentSnippets(limit: number): JournalSnippet[];
  readEmbedding(key: JournalEmbeddingCacheKey): Float32Array | null;
  writeEmbedding(input: JournalEmbeddingCacheWrite): void;
};
