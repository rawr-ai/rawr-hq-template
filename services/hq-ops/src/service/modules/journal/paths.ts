import path from "node:path";

export function journalRoot(repoRoot: string): string {
  return path.join(repoRoot, ".rawr", "journal");
}

export function eventsDir(repoRoot: string): string {
  return path.join(journalRoot(repoRoot), "events");
}

export function snippetsDir(repoRoot: string): string {
  return path.join(journalRoot(repoRoot), "snippets");
}

export function indexDbPath(repoRoot: string): string {
  return path.join(journalRoot(repoRoot), "index.sqlite");
}

export function eventJsonPath(repoRoot: string, id: string): string {
  return path.join(eventsDir(repoRoot), `${id}.json`);
}

export function snippetJsonPath(repoRoot: string, id: string): string {
  return path.join(snippetsDir(repoRoot), `${id}.json`);
}

