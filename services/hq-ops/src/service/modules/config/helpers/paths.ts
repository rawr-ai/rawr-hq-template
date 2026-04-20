import type { HqOpsResources } from "../../../shared/ports/resources";

type ConfigResources = Pick<HqOpsResources, "fs" | "path">;

export function rawrConfigPath(resources: ConfigResources, repoRoot: string): string {
  return resources.path.join(repoRoot, "rawr.config.ts");
}

export function rawrGlobalConfigPath(resources: ConfigResources): string {
  return resources.path.join(resources.path.homeDir(), ".rawr", "config.json");
}

export type { ConfigResources };
