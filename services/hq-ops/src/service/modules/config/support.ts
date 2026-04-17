import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Type } from "typebox";
import { Value } from "typebox/value";
import {
  clampJournalCandidateLimit,
  RawrConfigV1Schema,
  type ConfigValidationIssue,
  type LoadRawrConfigResult,
  type RawrConfig,
  type RawrConfigV1,
  type SyncDestination,
  type SyncProvider,
} from "./model";

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(value)));

export function rawrConfigPath(repoRoot: string): string {
  return path.join(repoRoot, "rawr.config.ts");
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

function pickConfigExport(mod: any): unknown {
  if (mod && typeof mod === "object" && "default" in mod) return (mod as any).default;
  return mod;
}

function formatIssues(issues: ConfigValidationIssue[]): string {
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
        error: {
          message: "Invalid rawr.config.ts",
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
