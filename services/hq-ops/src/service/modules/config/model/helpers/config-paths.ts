import type { PathResource } from "#hq-ops-service/model/ports/resources";

/** Resolves the workspace configuration module path. */
export function rawrConfigPath(path: PathResource, repoRoot: string): string {
  return path.join(repoRoot, "rawr.config.ts");
}

/** Resolves the global configuration document path. */
export function rawrGlobalConfigPath(path: PathResource): string {
  return path.join(path.homeDir(), ".rawr", "config.json");
}
