import type { JournalStore } from "../../shared/ports/journal-store";
import type { JournalEvent, JournalSnippet } from "./schemas";

export function createRepository(journalStore: JournalStore, repoRoot: string) {
  return {
    async writeEvent(event: JournalEvent) {
      return await journalStore.writeEvent(repoRoot, event);
    },
    async writeSnippet(snippet: JournalSnippet) {
      return await journalStore.writeSnippet(repoRoot, snippet);
    },
    async getSnippet(id: string) {
      return await journalStore.getSnippet(repoRoot, id);
    },
    async tailSnippets(limit: number) {
      return await journalStore.tailSnippets(repoRoot, limit);
    },
    async searchSnippets(query: string, limit: number, mode: "fts" | "semantic") {
      return await journalStore.searchSnippets(repoRoot, query, limit, mode);
    },
  };
}
