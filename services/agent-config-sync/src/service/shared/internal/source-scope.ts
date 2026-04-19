import path from "node:path";

import type { RawrPluginKind, SyncScope } from "../schemas";

export type ResolvedSourceScope = RawrPluginKind | "external";

const PLUGIN_SCOPE_ROOTS: Record<RawrPluginKind, string[]> = {
  toolkit: ["plugins", "cli"],
  agent: ["plugins", "agents"],
  web: ["plugins", "web"],
  api: ["plugins", "server", "api"],
  workflows: ["plugins", "async", "workflows"],
  schedules: ["plugins", "async", "schedules"],
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

  for (const [scope, root] of Object.entries(PLUGIN_SCOPE_ROOTS) as Array<[RawrPluginKind, string[]]>) {
    if (hasPrefix(relParts, root)) return scope;
  }

  return "external";
}

export function scopeAllows(scope: SyncScope, resolved: ResolvedSourceScope): boolean {
  if (scope === "all") return true;
  return resolved === scope;
}
