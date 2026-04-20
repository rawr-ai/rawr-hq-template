/**
 * hq-ops: config module.
 *
 * This router owns the HQ "configuration as data" capability: reading workspace
 * and global config, validating it at the service boundary, and producing a
 * layered/merged view for callers.
 *
 * Projections should not re-implement merge/validation rules; those rules are
 * part of the service contract.
 */
import type { RawrConfig } from "./entities";
import { loadGlobalRawrConfig, loadRawrConfig } from "./helpers/load";
import { rawrGlobalConfigPath } from "./helpers/paths";
import { validateRawrConfig } from "./helpers/validation";
import { module } from "./module";

const getWorkspaceConfig = module.getWorkspaceConfig.handler(async ({ context }) => {
  return await loadRawrConfig(context.deps.resources, context.scope.repoRoot);
});

const getGlobalConfig = module.getGlobalConfig.handler(async ({ context }) => {
  return await loadGlobalRawrConfig(context.deps.resources);
});

const getLayeredConfig = module.getLayeredConfig.handler(async ({ context }) => {
  const [global, workspace] = await Promise.all([
    loadGlobalRawrConfig(context.deps.resources),
    loadRawrConfig(context.deps.resources, context.scope.repoRoot),
  ]);
  const g = global.config;
  const w = workspace.config;

  if (!g && !w) return { global, workspace, merged: null };

  const uniqStrings = (a: string[] | undefined, b: string[] | undefined): string[] | undefined => {
    const all = [...(a ?? []), ...(b ?? [])].map((s) => s.trim()).filter(Boolean);
    return all.length === 0 ? undefined : [...new Set(all)];
  };
  const mergeById = <T extends { id: string }>(base: T[] | undefined, overlay: T[] | undefined): T[] | undefined => {
    if (!base && !overlay) return undefined;
    const out: T[] = [];
    for (const item of base ?? []) out.push(item);
    for (const item of overlay ?? []) {
      const existingIndex = out.findIndex((x) => x.id === item.id);
      if (existingIndex >= 0) out[existingIndex] = { ...out[existingIndex], ...item };
      else out.push(item);
    }
    return out;
  };

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
  return { global, workspace, merged: validated.ok ? validated.config : null };
});

const listGlobalSyncSources = module.listGlobalSyncSources.handler(async ({ context }) => {
  const loaded = await loadGlobalRawrConfig(context.deps.resources);
  return {
    path: rawrGlobalConfigPath(context.deps.resources),
    sources: loaded.config?.sync?.sources?.paths ?? [],
  };
});

const addGlobalSyncSource = module.addGlobalSyncSource.handler(async ({ context, input, errors }) => {
  const configPath = rawrGlobalConfigPath(context.deps.resources);
  const raw = await context.deps.resources.fs.readText(configPath);
  let parsed: unknown = { version: 1 };
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      parsed = { version: 1 };
    }
  }
  const validated = validateRawrConfig(parsed);
  if (!validated.ok) {
    throw errors.INVALID_GLOBAL_CONFIG({
      message: `Invalid ~/.rawr/config.json: ${validated.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
      data: { issues: validated.issues },
    });
  }

  const next = validated.config;
  next.sync = next.sync ?? {};
  next.sync.sources = next.sync.sources ?? {};
  const existing = Array.isArray(next.sync.sources.paths) ? next.sync.sources.paths : [];
  next.sync.sources.paths = [...new Set([...existing, input.path])];

  await context.deps.resources.fs.mkdir(context.deps.resources.path.dirname(configPath));
  await context.deps.resources.fs.writeText(configPath, `${JSON.stringify(next, null, 2)}\n`);
  return {
    path: configPath,
    sources: next.sync.sources.paths,
  };
});

const removeGlobalSyncSource = module.removeGlobalSyncSource.handler(async ({ context, input, errors }) => {
  const configPath = rawrGlobalConfigPath(context.deps.resources);
  const raw = await context.deps.resources.fs.readText(configPath);
  let parsed: unknown = { version: 1 };
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      parsed = { version: 1 };
    }
  }
  const validated = validateRawrConfig(parsed);
  if (!validated.ok) {
    throw errors.INVALID_GLOBAL_CONFIG({
      message: `Invalid ~/.rawr/config.json: ${validated.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
      data: { issues: validated.issues },
    });
  }

  const next = validated.config;
  next.sync = next.sync ?? {};
  next.sync.sources = next.sync.sources ?? {};
  const existing = Array.isArray(next.sync.sources.paths) ? next.sync.sources.paths : [];
  next.sync.sources.paths = existing.filter((entry) => entry !== input.path);

  await context.deps.resources.fs.mkdir(context.deps.resources.path.dirname(configPath));
  await context.deps.resources.fs.writeText(configPath, `${JSON.stringify(next, null, 2)}\n`);
  return {
    path: configPath,
    sources: next.sync.sources.paths,
  };
});

export const router = module.router({
  getWorkspaceConfig,
  getGlobalConfig,
  getLayeredConfig,
  listGlobalSyncSources,
  addGlobalSyncSource,
  removeGlobalSyncSource,
});
