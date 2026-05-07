export function normalizePathSeparators(value: string): string {
  return value.replace(/\\/g, "/");
}

export function basename(value: string): string {
  const normalized = normalizePathSeparators(value).replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts.at(-1) ?? normalized;
}

export function stripKnownSessionExtension(value: string): string {
  return value.replace(/\.(jsonl|json)$/i, "");
}

export function stem(value: string): string {
  return stripKnownSessionExtension(basename(value));
}

export function looksLikePath(input: string): boolean {
  return input.includes("/") || input.includes("\\") || input.endsWith(".jsonl") || input.endsWith(".json") || input.startsWith("~");
}

export function inferProjectFromCwd(cwd?: string): string | undefined {
  if (!cwd) return undefined;
  const value = basename(cwd);
  return value || undefined;
}

export function inferStatusFromPath(filePath: string): "live" | "archived" | undefined {
  const normalized = normalizePathSeparators(filePath);
  if (normalized.includes("/archived_sessions/")) return "archived";
  if (normalized.includes("/sessions/")) return "live";
  return undefined;
}
