import fs from "node:fs/promises";
import { openJournalDb, searchSnippetsFts, tailSnippets as tailIndexedSnippets, upsertSnippet } from "./index-db";
import { eventJsonPath, eventsDir, snippetJsonPath, snippetsDir } from "./paths";
import { searchSnippetsSemantic } from "./semantic";
import type { SqliteDatabase } from "./sqlite";

export type JournalEvent = {
  id: string;
  ts: string;
  cwd: string;
  argv: string[];
  commandId?: string;
  exitCode?: number;
  durationMs?: number;
  artifacts?: string[];
  steps?: Array<{ name: string; status: string; durationMs?: number; exitCode?: number }>;
};

export type JournalSnippetKind = "command" | "workflow" | "security" | "note";

export type JournalSnippet = {
  id: string;
  ts: string;
  kind: JournalSnippetKind;
  title: string;
  preview: string;
  body: string;
  tags: string[];
  sourceEventId?: string;
};

export type JournalSearchRow = Pick<JournalSnippet, "id" | "ts" | "kind" | "title" | "preview" | "tags"> & {
  sourceEventId?: string;
  score?: number;
};

export type JournalWriteResult = { path: string };
export type JournalSearchResult = {
  mode: "fts" | "semantic";
  warning?: string;
  snippets: JournalSearchRow[];
};

async function readSnippetJson(repoRoot: string, id: string): Promise<JournalSnippet | null> {
  try {
    return JSON.parse(await fs.readFile(snippetJsonPath(repoRoot, id), "utf8")) as JournalSnippet;
  } catch {
    return null;
  }
}

export async function writeEvent(repoRoot: string, event: JournalEvent): Promise<string> {
  await fs.mkdir(eventsDir(repoRoot), { recursive: true });
  const filePath = eventJsonPath(repoRoot, event.id);
  await fs.writeFile(filePath, JSON.stringify(event, null, 2), "utf8");
  return filePath;
}

export async function writeSnippet(repoRoot: string, snippet: JournalSnippet, db?: SqliteDatabase): Promise<string> {
  await fs.mkdir(snippetsDir(repoRoot), { recursive: true });
  const filePath = snippetJsonPath(repoRoot, snippet.id);
  await fs.writeFile(filePath, JSON.stringify(snippet, null, 2), "utf8");

  let localDb: SqliteDatabase | undefined;
  try {
    localDb = db ?? (await openJournalDb(repoRoot));
    upsertSnippet(localDb, snippet);
  } catch {
    // JSON remains the source of truth even if the sqlite index is unavailable.
  } finally {
    if (!db && localDb) localDb.close();
  }

  return filePath;
}

export function createNodeJournalStore() {
  return {
    async writeEvent(repoRoot: string, event: JournalEvent): Promise<JournalWriteResult> {
      return { path: await writeEvent(repoRoot, event) };
    },
    async writeSnippet(repoRoot: string, snippet: JournalSnippet): Promise<JournalWriteResult> {
      return { path: await writeSnippet(repoRoot, snippet) };
    },
    async getSnippet(repoRoot: string, id: string): Promise<{ snippet: JournalSnippet | null }> {
      return { snippet: await readSnippetJson(repoRoot, id) };
    },
    async tailSnippets(repoRoot: string, limit: number): Promise<{ snippets: JournalSearchRow[] }> {
      const db = await openJournalDb(repoRoot);
      try {
        return { snippets: tailIndexedSnippets(db, limit) };
      } finally {
        db.close();
      }
    },
    async searchSnippets(
      repoRoot: string,
      query: string,
      limit: number,
      mode: "fts" | "semantic",
    ): Promise<JournalSearchResult> {
      const db = await openJournalDb(repoRoot);
      try {
        if (mode === "semantic") {
          try {
            return { mode, snippets: await searchSnippetsSemantic(db, query, limit) };
          } catch (error) {
            return {
              mode,
              warning: error instanceof Error ? error.message : String(error),
              snippets: [],
            };
          }
        }
        return { mode, snippets: searchSnippetsFts(db, query, limit) };
      } finally {
        db.close();
      }
    },
  };
}
