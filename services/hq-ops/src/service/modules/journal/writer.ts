import fs from "node:fs/promises";
import { openJournalDb, upsertSnippet } from "./index-db.js";
import { eventJsonPath, eventsDir, snippetJsonPath, snippetsDir } from "./paths.js";
import type { SqliteDatabase } from "./sqlite.js";
import type { JournalEvent, JournalSnippet } from "./types.js";

export async function writeEvent(repoRoot: string, event: JournalEvent): Promise<string> {
  await fs.mkdir(eventsDir(repoRoot), { recursive: true });
  const p = eventJsonPath(repoRoot, event.id);
  await fs.writeFile(p, JSON.stringify(event, null, 2), "utf8");
  return p;
}

export async function writeSnippet(repoRoot: string, snippet: JournalSnippet, db?: SqliteDatabase): Promise<string> {
  await fs.mkdir(snippetsDir(repoRoot), { recursive: true });
  const p = snippetJsonPath(repoRoot, snippet.id);
  await fs.writeFile(p, JSON.stringify(snippet, null, 2), "utf8");

  let localDb: SqliteDatabase | undefined;
  try {
    localDb = db ?? (await openJournalDb(repoRoot));
    upsertSnippet(localDb, snippet);
  } catch {
    // Best-effort: snippet JSON is the source of truth; sqlite is an index.
  } finally {
    if (!db && localDb) localDb.close();
  }

  return p;
}
