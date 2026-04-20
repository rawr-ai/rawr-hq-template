import { Value } from "typebox/value";
import type { HqOpsResources } from "../../shared/ports/resources";
import {
  clampJournalCandidateLimit,
  RawrConfigV1Schema,
  type RawrConfig,
  type RawrConfigV1,
  type SyncDestination,
  type SyncProvider,
} from "./entities";
import type { ConfigValidationIssue, LoadRawrConfigLayeredResult, LoadRawrConfigResult } from "./contract";

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(value)));

type ConfigResources = Pick<HqOpsResources, "fs" | "path">;

export function rawrConfigPath(resources: ConfigResources, repoRoot: string): string {
  return resources.path.join(repoRoot, "rawr.config.ts");
}

function formatTypeBoxIssues(maybeConfig: unknown): ConfigValidationIssue[] {
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
  dests: SyncDestination[] | undefined,
): SyncDestination[] | undefined {
  if (!dests) return undefined;
  return dests.map((d) => {
    const out: any = {
      ...d,
      enabled: d.enabled ?? true,
      id: String(d.id).trim(),
    };
    if (typeof d.rootPath === "string") out.rootPath = d.rootPath.trim();
    return out as SyncDestination;
  });
}

function normalizeProvider(
  providerKey: "codex" | "claude",
  provider: SyncProvider | undefined,
): SyncProvider | undefined {
  if (!provider) return undefined;
  return {
    ...provider,
    includeAgents: provider.includeAgents ?? (providerKey === "claude"),
    destinations: normalizeDestinations(provider.destinations),
  };
}

function validateNonEmptyTrimmed(pathKey: string, value: string | undefined, issues: ConfigValidationIssue[]) {
  if (value === undefined) return;
  if (value.trim().length === 0) issues.push({ path: pathKey, message: "must be non-empty" });
}

function validateSyncDestinations(cfg: RawrConfigV1, issues: ConfigValidationIssue[]) {
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
): { ok: true; config: RawrConfig } | { ok: false; issues: ConfigValidationIssue[] } {
  if (!Value.Check(RawrConfigV1Schema, maybeConfig)) {
    return { ok: false, issues: formatTypeBoxIssues(maybeConfig) };
  }

  const cfg = maybeConfig as RawrConfigV1;

  const issues: ConfigValidationIssue[] = [];
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
            candidateLimit: clampJournalCandidateLimit(cfg.journal.semantic.candidateLimit),
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

function pickConfigExport(mod: unknown): unknown {
  if (mod && typeof mod === "object" && "default" in mod) return (mod as any).default;
  return mod;
}

function formatIssues(issues: ConfigValidationIssue[]): string {
  return issues.map((i) => `${i.path}: ${i.message}`).join("\n");
}

function parseStaticDefaultConfig(source: string): unknown | null {
  const match = source.match(/^\s*export\s+default\s+([\s\S]*?);?\s*$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]!);
  } catch {
    return null;
  }
}

export async function loadRawrConfig(resources: ConfigResources, repoRoot: string): Promise<LoadRawrConfigResult> {
  const configPath = rawrConfigPath(resources, repoRoot);

  let st: { mtimeMs: number } | null = null;
  const stat = await resources.fs.stat(configPath);
  if (!stat) {
    return { config: null, path: null, warnings: [] };
  }
  if (!stat.isFile) return { config: null, path: null, warnings: [] };
  st = { mtimeMs: stat.mtimeMs };

  const warnings: string[] = [];
  try {
    const baseHref = resources.path.toFileHref(configPath);
    const href = `${baseHref}?mtime=${encodeURIComponent(String(st?.mtimeMs ?? Date.now()))}`;
    const mod = await import(href);
    const exported = pickConfigExport(mod);

    const validated = validateRawrConfig(exported);
    if (!validated.ok) {
      return {
        config: null,
        path: configPath,
        warnings,
        error: {
          message: "Invalid rawr.config.ts",
          cause: formatIssues(validated.issues),
          issues: validated.issues,
        },
      };
    }

    return { config: validated.config, path: configPath, warnings };
  } catch (err) {
    const raw = await resources.fs.readText(configPath);
    const staticConfig = raw === null ? null : parseStaticDefaultConfig(raw);
    if (staticConfig !== null) {
      const validated = validateRawrConfig(staticConfig);
      if (!validated.ok) {
        return {
          config: null,
          path: configPath,
          warnings,
          error: {
            message: "Invalid rawr.config.ts",
            cause: formatIssues(validated.issues),
            issues: validated.issues,
          },
        };
      }

      return { config: validated.config, path: configPath, warnings };
    }

    return {
      config: null,
      path: configPath,
      warnings,
      error: { message: "Failed to load rawr.config.ts", cause: String(err) },
    };
  }
}

export function rawrGlobalConfigPath(resources: ConfigResources): string {
  return resources.path.join(resources.path.homeDir(), ".rawr", "config.json");
}

export async function loadGlobalRawrConfig(resources: ConfigResources): Promise<LoadRawrConfigResult> {
  const configPath = rawrGlobalConfigPath(resources);

  const stat = await resources.fs.stat(configPath);
  if (!stat) {
    return { config: null, path: null, warnings: [] };
  }
  if (!stat.isFile) return { config: null, path: null, warnings: [] };

  const warnings: string[] = [];
  try {
    const raw = await resources.fs.readText(configPath);
    if (raw === null) return { config: null, path: null, warnings: [] };
    const parsedJson = JSON.parse(raw) as unknown;
    const validated = validateRawrConfig(parsedJson);
    if (!validated.ok) {
      return {
        config: null,
        path: configPath,
        warnings,
        error: {
          message: "Invalid ~/.rawr/config.json",
          cause: formatIssues(validated.issues),
          issues: validated.issues,
        },
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

export async function loadRawrConfigLayered(
  resources: ConfigResources,
  repoRoot: string,
): Promise<LoadRawrConfigLayeredResult> {
  const [global, workspace] = await Promise.all([loadGlobalRawrConfig(resources), loadRawrConfig(resources, repoRoot)]);
  const merged = mergeRawrConfigLayers({ global: global.config, workspace: workspace.config });
  return { global, workspace, merged };
}

async function readGlobalConfig(resources: ConfigResources): Promise<unknown> {
  const configPath = rawrGlobalConfigPath(resources);
  const raw = await resources.fs.readText(configPath);
  if (raw === null) return { version: 1 };

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { version: 1 };
  }
}

async function writeGlobalConfig(resources: ConfigResources, config: RawrConfig): Promise<void> {
  const configPath = rawrGlobalConfigPath(resources);
  await resources.fs.mkdir(resources.path.dirname(configPath));
  await resources.fs.writeText(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

export async function listGlobalSyncSources(resources: ConfigResources): Promise<{ path: string | null; sources: string[] }> {
  const loaded = await loadGlobalRawrConfig(resources);
  return {
    path: rawrGlobalConfigPath(resources),
    sources: loaded.config?.sync?.sources?.paths ?? [],
  };
}

export async function addGlobalSyncSource(
  resources: ConfigResources,
  sourcePath: string,
): Promise<{ path: string | null; sources: string[] }> {
  const rawConfig = await readGlobalConfig(resources);
  const validated = validateRawrConfig(rawConfig);
  if (!validated.ok) {
    throw new Error(
      `Invalid ~/.rawr/config.json: ${validated.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
    );
  }

  const next = validated.config;
  next.sync = next.sync ?? {};
  next.sync.sources = next.sync.sources ?? {};

  const existing = Array.isArray(next.sync.sources.paths) ? next.sync.sources.paths : [];
  next.sync.sources.paths = [...new Set([...existing, sourcePath])];

  await writeGlobalConfig(resources, next);
  return {
    path: rawrGlobalConfigPath(resources),
    sources: next.sync.sources.paths,
  };
}

export async function removeGlobalSyncSource(
  resources: ConfigResources,
  sourcePath: string,
): Promise<{ path: string | null; sources: string[] }> {
  const rawConfig = await readGlobalConfig(resources);
  const validated = validateRawrConfig(rawConfig);
  if (!validated.ok) {
    throw new Error(
      `Invalid ~/.rawr/config.json: ${validated.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
    );
  }

  const next = validated.config;
  next.sync = next.sync ?? {};
  next.sync.sources = next.sync.sources ?? {};

  const existing = Array.isArray(next.sync.sources.paths) ? next.sync.sources.paths : [];
  next.sync.sources.paths = existing.filter((entry) => entry !== sourcePath);

  await writeGlobalConfig(resources, next);
  return {
    path: rawrGlobalConfigPath(resources),
    sources: next.sync.sources.paths,
  };
}
