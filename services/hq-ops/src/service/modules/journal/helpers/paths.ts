import type { HqOpsResources } from "../../../shared/ports/resources";

export function journalRoot(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(repoRoot, ".rawr", "journal");
}

export function eventsDir(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(journalRoot(resources, repoRoot), "events");
}

export function snippetsDir(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(journalRoot(resources, repoRoot), "snippets");
}

export function indexDbPath(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(journalRoot(resources, repoRoot), "index.sqlite");
}

export function eventJsonPath(resources: HqOpsResources, repoRoot: string, id: string): string {
  return resources.path.join(eventsDir(resources, repoRoot), `${id}.json`);
}

export function snippetJsonPath(resources: HqOpsResources, repoRoot: string, id: string): string {
  return resources.path.join(snippetsDir(resources, repoRoot), `${id}.json`);
}
