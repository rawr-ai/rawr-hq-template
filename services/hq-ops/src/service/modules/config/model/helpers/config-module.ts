/** Selects a JavaScript module's default export when one is present. */
export function pickConfigExport(mod: unknown): unknown {
  if (mod && typeof mod === "object" && "default" in mod) {
    return (mod as { default: unknown }).default;
  }
  return mod;
}

/** Parses the static JSON subset accepted as a fallback config module body. */
export function parseStaticDefaultConfig(source: string): unknown | null {
  const match = source.match(/^\s*export\s+default\s+([\s\S]*?);?\s*$/);
  const json = match?.[1];
  if (json === undefined) return null;

  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
