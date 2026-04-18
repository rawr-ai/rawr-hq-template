import path from "node:path";

import type { SyncScope } from "./types";

export type ResolvedSourceScope = "agents" | "cli" | "web" | "external";

const PLUGIN_SCOPE_ROOTS: Record<Exclude<ResolvedSourceScope, "external">, string[]> = {
  agents: ["plugins", "agents"],
  cli: ["plugins", "cli"],
  web: ["plugins", "web"],
};

function hasPrefix(parts: string[], prefix: string[]): boolean {
  if (prefix.length > parts.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (parts[i] !== prefix[i]) return false;
  }
  return true;
}

export function resolveSourceScopeForPath(absPath: string, workspaceRoot: string): ResolvedSourceScope {
  const rel = path.relative(path.resolve(workspaceRoot), path.resolve(absPath));
  if (rel.startsWith("..")) return "external";

  const relParts = rel.split(path.sep).filter(Boolean);

  if (hasPrefix(relParts, PLUGIN_SCOPE_ROOTS.agents)) return "agents";
  if (hasPrefix(relParts, PLUGIN_SCOPE_ROOTS.cli)) return "cli";
  if (hasPrefix(relParts, PLUGIN_SCOPE_ROOTS.web)) return "web";

  return "external";
}

export function scopeAllows(scope: SyncScope, resolved: ResolvedSourceScope): boolean {
  if (scope === "all") return true;
  return resolved === scope;
}
