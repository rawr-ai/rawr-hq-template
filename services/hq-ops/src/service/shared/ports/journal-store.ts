import type {
  JournalEvent,
  JournalSearchRow,
  JournalSnippet,
} from "../../modules/journal/schemas";

export interface JournalStore {
  writeEvent(repoRoot: string, event: JournalEvent): Promise<{ path: string }>;
  writeSnippet(repoRoot: string, snippet: JournalSnippet): Promise<{ path: string }>;
  getSnippet(repoRoot: string, id: string): Promise<{ snippet: JournalSnippet | null }>;
  tailSnippets(repoRoot: string, limit: number): Promise<{ snippets: JournalSearchRow[] }>;
  searchSnippets(
    repoRoot: string,
    query: string,
    limit: number,
    mode: "fts" | "semantic",
  ): Promise<{ mode: "fts" | "semantic"; warning?: string; snippets: JournalSearchRow[] }>;
}
