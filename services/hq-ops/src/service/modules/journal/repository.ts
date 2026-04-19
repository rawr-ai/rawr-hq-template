import fs from "node:fs/promises";
import { loadRawrConfig } from "../config/support";
import { snippetJsonPath } from "./paths.js";
import { openJournalDb, searchSnippetsFts, tailSnippets } from "./support.js";
import { searchSnippetsSemantic } from "./semantic.js";
import type { JournalEvent, JournalSnippet } from "./schemas";
import { writeEvent, writeSnippet } from "./writer.js";

export function createRepository(repoRoot: string) {
  return {
    async writeEvent(event: JournalEvent) {
      return {
        path: await writeEvent(repoRoot, event),
      };
    },
    async writeSnippet(snippet: JournalSnippet) {
      return {
        path: await writeSnippet(repoRoot, snippet),
      };
    },
    async getSnippet(id: string) {
      const snippetPath = snippetJsonPath(repoRoot, id);
      try {
        return {
          snippet: JSON.parse(await fs.readFile(snippetPath, "utf8")) as JournalSnippet,
        };
      } catch {
        return { snippet: null };
      }
    },
    async tailSnippets(limit: number) {
      const db = await openJournalDb(repoRoot);
      try {
        return {
          snippets: tailSnippets(db, limit),
        };
      } finally {
        db.close();
      }
    },
    async searchSnippets(query: string, limit: number, mode: "fts" | "semantic") {
      const db = await openJournalDb(repoRoot);
      try {
        if (mode === "semantic") {
          const loaded = await loadRawrConfig(repoRoot);
          const candidateLimit = loaded.config?.journal?.semantic?.candidateLimit ?? 200;
          const model = loaded.config?.journal?.semantic?.model;
          const env = model ? { ...process.env, RAWR_EMBEDDINGS_MODEL: model } : process.env;

          try {
            return {
              mode: "semantic" as const,
              snippets: await searchSnippetsSemantic(db, query, limit, { candidateLimit, env }),
            };
          } catch {
            return {
              mode: "fts" as const,
              warning: "semantic search not configured; falling back to keyword search",
              snippets: searchSnippetsFts(db, query, limit),
            };
          }
        }

        return {
          mode: "fts" as const,
          snippets: searchSnippetsFts(db, query, limit),
        };
      } finally {
        db.close();
      }
    },
  };
}
