import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { type Static,Type } from "typebox";
import { Value } from "typebox/value";

export type RiskTolerance = "strict" | "balanced" | "permissive" | "off";

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(value)));

const RiskToleranceSchema = Type.Union([
  Type.Literal("strict"),
  Type.Literal("balanced"),
  Type.Literal("permissive"),
  Type.Literal("off"),
]);

const PluginChannelPolicySchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const PluginChannelsSchema = Type.Object(
  {
    workspace: Type.Optional(PluginChannelPolicySchema),
    external: Type.Optional(PluginChannelPolicySchema),
  },
  { additionalProperties: false },
);

const SyncAgentSchema = Type.Union([Type.Literal("codex"), Type.Literal("claude"), Type.Literal("all")]);

const SyncDestinationSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    // Optional to allow workspace overlays to tweak enabled/options by id without repeating the path.
    // The merged config is expected to produce concrete rootPaths for enabled destinations.
    rootPath: Type.Optional(Type.String({ minLength: 1 })),
    enabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const SyncProviderSchema = Type.Object(
  {
    destinations: Type.Optional(Type.Array(SyncDestinationSchema)),
    includeAgents: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const SyncConfigSchema = Type.Object(
  {
    defaults: Type.Optional(
      Type.Object(
        {
          agent: Type.Optional(SyncAgentSchema),
        },
        { additionalProperties: false },
      ),
    ),
    sources: Type.Optional(
      Type.Object(
        {
          paths: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
        },
        { additionalProperties: false },
      ),
    ),
    providers: Type.Optional(
      Type.Object(
        {
          codex: Type.Optional(SyncProviderSchema),
          claude: Type.Optional(SyncProviderSchema),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const RawrConfigV1Schema = Type.Object(
  {
    version: Type.Literal(1),
    plugins: Type.Optional(
      Type.Object(
        {
          defaultRiskTolerance: Type.Optional(RiskToleranceSchema),
          channels: Type.Optional(PluginChannelsSchema),
        },
        { additionalProperties: false },
      ),
    ),
    journal: Type.Optional(
      Type.Object(
        {
          semantic: Type.Optional(
            Type.Object(
              {
                candidateLimit: Type.Optional(Type.Integer()),
                model: Type.Optional(Type.String()),
              },
              { additionalProperties: false },
            ),
          ),
        },
        { additionalProperties: false },
      ),
    ),
    server: Type.Optional(
      Type.Object(
        {
          port: Type.Optional(Type.Integer()),
          baseUrl: Type.Optional(Type.String()),
        },
        { additionalProperties: false },
      ),
    ),
    sync: Type.Optional(SyncConfigSchema),
  },
  { additionalProperties: false },
);

export type RawrConfigV1 = Static<typeof RawrConfigV1Schema>;
export type RawrConfig = RawrConfigV1;

export function rawrConfigPath(repoRoot: string): string {
  return path.join(repoRoot, "rawr.config.ts");
}

function formatTypeBoxIssues(maybeConfig: unknown): Array<{ path: string; message: string }> {
  const errors = [...Value.Errors(RawrConfigV1Schema, maybeConfig)] as any[];
  return errors.map((e) => {
    const ip = typeof e.instancePath === "string" ? e.instancePath : "";
    return {
      path: ip.length ? ip.replace(/^\//, "").replace(/\//g, ".") : "(root)",
      message: typeof e.message === "string" ? e.message : "invalid",
    };
  });
}

function normalizeDestinations(
  dests: Array<Static<typeof SyncDestinationSchema>> | undefined,
): Array<Static<typeof SyncDestinationSchema>> | undefined {
  if (!dests) return undefined;
  return dests.map((d) => {
    const out: any = {
      ...d,
      enabled: d.enabled ?? true,
      id: String(d.id).trim(),
    };
    if (typeof d.rootPath === "string") out.rootPath = d.rootPath.trim();
    return out as Static<typeof SyncDestinationSchema>;
  });
}

function normalizeProvider(
  providerKey: "codex" | "claude",
  provider: Static<typeof SyncProviderSchema> | undefined,
): Static<typeof SyncProviderSchema> | undefined {
  if (!provider) return undefined;
  return {
    ...provider,
    includeAgents: provider.includeAgents ?? (providerKey === "claude"),
    destinations: normalizeDestinations(provider.destinations),
  };
}

function validateNonEmptyTrimmed(pathKey: string, value: string | undefined, issues: Array<{ path: string; message: string }>) {
  if (value === undefined) return;
  if (value.trim().length === 0) issues.push({ path: pathKey, message: "must be non-empty" });
}

function validateSyncDestinations(cfg: RawrConfigV1, issues: Array<{ path: string; message: string }>) {
  const providers = cfg.sync?.providers;
  if (!providers) return;

  const checkProvider = (providerKey: "codex" | "claude") => {
    const dests = providers[providerKey]?.destinations ?? [];
    for (let i = 0; i < dests.length; i += 1) {
      const d = dests[i]!;
      const base = `sync.providers.${providerKey}.destinations.${i}`;
      validateNonEmptyTrimmed(`${base}.id`, d.id, issues);
      // Note: rootPath is allowed to be omitted in a single layer (e.g. workspace overlay),
      // as long as the merged config results in enabled destinations with concrete rootPaths.
    }
  };

  checkProvider("codex");
  checkProvider("claude");
}

export function validateRawrConfig(
  maybeConfig: unknown,
): { ok: true; config: RawrConfig } | { ok: false; issues: Array<{ path: string; message: string }> } {
  if (!Value.Check(RawrConfigV1Schema, maybeConfig)) {
    return { ok: false, issues: formatTypeBoxIssues(maybeConfig) };
  }

  const cfg = maybeConfig as RawrConfigV1;

  const issues: Array<{ path: string; message: string }> = [];
  validateSyncDestinations(cfg, issues);
  if (issues.length) return { ok: false, issues };

  const normalized: RawrConfig = {
    ...cfg,
    plugins: cfg.plugins
      ? {
          ...cfg.plugins,
          channels: {
            workspace: { enabled: cfg.plugins.channels?.workspace?.enabled ?? true },
            external: { enabled: cfg.plugins.channels?.external?.enabled ?? false },
          },
          defaultRiskTolerance: cfg.plugins.defaultRiskTolerance,
        }
      : {
          channels: { workspace: { enabled: true }, external: { enabled: false } },
        },
    journal: cfg.journal?.semantic
      ? {
          ...cfg.journal,
          semantic: {
            ...cfg.journal.semantic,
            candidateLimit: clampInt(cfg.journal.semantic.candidateLimit ?? 200, 1, 500),
            model: cfg.journal.semantic.model,
          },
        }
      : cfg.journal,
    server: cfg.server
      ? {
          ...cfg.server,
          port: typeof cfg.server.port === "number" ? clampInt(cfg.server.port, 1, 65535) : cfg.server.port,
          baseUrl: cfg.server.baseUrl,
        }
      : cfg.server,
    sync: cfg.sync
      ? {
          ...cfg.sync,
          sources: cfg.sync.sources
            ? {
                ...cfg.sync.sources,
                paths: cfg.sync.sources.paths?.map((p) => String(p).trim()).filter((p) => p.length > 0),
              }
            : cfg.sync.sources,
          providers: cfg.sync.providers
            ? {
                ...cfg.sync.providers,
                codex: normalizeProvider("codex", cfg.sync.providers.codex),
                claude: normalizeProvider("claude", cfg.sync.providers.claude),
              }
            : cfg.sync.providers,
        }
      : cfg.sync,
  };

  // Enforce non-empty model if present (post-trim).
  const model = normalized.journal?.semantic?.model;
  if (typeof model === "string" && model.trim().length === 0) {
    return { ok: false, issues: [{ path: "journal.semantic.model", message: "model must be non-empty" }] };
  }

  return { ok: true, config: normalized };
}

export type LoadRawrConfigResult = {
  config: RawrConfig | null;
  path: string | null;
  warnings: string[];
  error?: { message: string; cause?: string };
};

function pickConfigExport(mod: any): unknown {
  if (mod && typeof mod === "object" && "default" in mod) return (mod as any).default;
  return mod;
}

function formatIssues(issues: Array<{ path: string; message: string }>): string {
  return issues.map((i) => `${i.path}: ${i.message}`).join("\n");
}

export async function loadRawrConfig(repoRoot: string): Promise<LoadRawrConfigResult> {
  const configPath = rawrConfigPath(repoRoot);

  let st: { mtimeMs: number } | null = null;
  try {
    const stat = await fs.stat(configPath);
    if (!stat.isFile()) return { config: null, path: null, warnings: [] };
    st = { mtimeMs: stat.mtimeMs };
  } catch {
    return { config: null, path: null, warnings: [] };
  }

  const warnings: string[] = [];
  try {
    const baseHref = pathToFileURL(configPath).href;
    const href = `${baseHref}?mtime=${encodeURIComponent(String(st?.mtimeMs ?? Date.now()))}`;
    const mod = (await import(href)) as any;
    const exported = pickConfigExport(mod);

    const validated = validateRawrConfig(exported);
    if (!validated.ok) {
      return {
        config: null,
        path: configPath,
        warnings,
        error: { message: "Invalid rawr.config.ts", cause: formatIssues(validated.issues) },
      };
    }

    return { config: validated.config, path: configPath, warnings };
  } catch (err) {
    return {
      config: null,
      path: configPath,
      warnings,
      error: { message: "Failed to load rawr.config.ts", cause: String(err) },
    };
  }
}

export function rawrGlobalConfigPath(): string {
  return path.join(os.homedir(), ".rawr", "config.json");
}

export async function loadGlobalRawrConfig(): Promise<LoadRawrConfigResult> {
  const configPath = rawrGlobalConfigPath();

  try {
    const stat = await fs.stat(configPath);
    if (!stat.isFile()) return { config: null, path: null, warnings: [] };
  } catch {
    return { config: null, path: null, warnings: [] };
  }

  const warnings: string[] = [];
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsedJson = JSON.parse(raw) as unknown;
    const validated = validateRawrConfig(parsedJson);
    if (!validated.ok) {
      return {
        config: null,
        path: configPath,
        warnings,
        error: { message: "Invalid ~/.rawr/config.json", cause: formatIssues(validated.issues) },
      };
    }
    return { config: validated.config, path: configPath, warnings };
  } catch (err) {
    return {
      config: null,
      path: configPath,
      warnings,
      error: { message: "Failed to load ~/.rawr/config.json", cause: String(err) },
    };
  }
}

function mergeById<T extends { id: string }>(base: T[] | undefined, overlay: T[] | undefined): T[] | undefined {
  if (!base && !overlay) return undefined;
  const out: T[] = [];

  for (const item of base ?? []) out.push(item);
  for (const item of overlay ?? []) {
    const existingIndex = out.findIndex((x) => x.id === item.id);
    if (existingIndex >= 0) out[existingIndex] = { ...out[existingIndex], ...item };
    else out.push(item);
  }

  return out;
}

function uniqStrings(a: string[] | undefined, b: string[] | undefined): string[] | undefined {
  const all = [...(a ?? []), ...(b ?? [])].map((s) => s.trim()).filter(Boolean);
  if (all.length === 0) return undefined;
  return [...new Set(all)];
}

export function mergeRawrConfigLayers(input: { global: RawrConfig | null; workspace: RawrConfig | null }): RawrConfig | null {
  const g = input.global;
  const w = input.workspace;
  if (!g && !w) return null;

  const merged: RawrConfig = {
    version: 1,
    plugins: { ...(g?.plugins ?? {}), ...(w?.plugins ?? {}) },
    journal: { ...(g?.journal ?? {}), ...(w?.journal ?? {}) },
    server: { ...(g?.server ?? {}), ...(w?.server ?? {}) },
    sync: undefined,
  };

  const gs = g?.sync;
  const ws = w?.sync;
  if (gs || ws) {
    merged.sync = {
      ...(gs ?? {}),
      ...(ws ?? {}),
      defaults: { ...(gs?.defaults ?? {}), ...(ws?.defaults ?? {}) },
      sources: {
        paths: uniqStrings(gs?.sources?.paths, ws?.sources?.paths),
      },
      providers: {
        codex:
          gs?.providers?.codex || ws?.providers?.codex
            ? {
                ...(gs?.providers?.codex ?? {}),
                ...(ws?.providers?.codex ?? {}),
                destinations: mergeById(gs?.providers?.codex?.destinations, ws?.providers?.codex?.destinations),
              }
            : undefined,
        claude:
          gs?.providers?.claude || ws?.providers?.claude
            ? {
                ...(gs?.providers?.claude ?? {}),
                ...(ws?.providers?.claude ?? {}),
                destinations: mergeById(gs?.providers?.claude?.destinations, ws?.providers?.claude?.destinations),
              }
            : undefined,
      },
    };
  }

  const validated = validateRawrConfig(merged);
  if (validated.ok) return validated.config;
  return null;
}

export type LoadRawrConfigLayeredResult = {
  global: LoadRawrConfigResult;
  workspace: LoadRawrConfigResult;
  merged: RawrConfig | null;
};

export async function loadRawrConfigLayered(repoRoot: string): Promise<LoadRawrConfigLayeredResult> {
  const [global, workspace] = await Promise.all([loadGlobalRawrConfig(), loadRawrConfig(repoRoot)]);
  const merged = mergeRawrConfigLayers({ global: global.config, workspace: workspace.config });
  return { global, workspace, merged };
}
