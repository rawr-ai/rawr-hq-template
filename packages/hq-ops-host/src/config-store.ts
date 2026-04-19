import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

export type RiskTolerance = "strict" | "balanced" | "permissive" | "off";
export type ConfigValidationIssue = { path: string; message: string };
export type ConfigLoadError = {
  message: string;
  cause?: string;
  issues?: ConfigValidationIssue[];
};
export type RawrConfigV1 = Static<typeof RawrConfigV1Schema>;
export type RawrConfig = RawrConfigV1;
export type ConfigLoadResult = {
  config: RawrConfig | null;
  path: string | null;
  warnings: string[];
  error?: ConfigLoadError;
};
export type ConfigLayeredResult = {
  global: ConfigLoadResult;
  workspace: ConfigLoadResult;
  merged: RawrConfig | null;
};
export type SyncSourcesResult = {
  path: string | null;
  sources: string[];
};

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

const RawrConfigV1Schema = Type.Object(
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

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(value)));

function rawrConfigPath(repoRoot: string): string {
  return path.join(repoRoot, "rawr.config.ts");
}

function rawrGlobalConfigPath(): string {
  return path.join(os.homedir(), ".rawr", "config.json");
}

function formatTypeBoxIssues(maybeConfig: unknown): ConfigValidationIssue[] {
  const errors = [...Value.Errors(RawrConfigV1Schema, maybeConfig)] as Array<{
    instancePath?: string;
    message?: string;
  }>;

  return errors.map((error) => {
    const instancePath = typeof error.instancePath === "string" ? error.instancePath : "";
    return {
      path: instancePath.length ? instancePath.replace(/^\//, "").replace(/\//g, ".") : "(root)",
      message: typeof error.message === "string" ? error.message : "invalid",
    };
  });
}

function normalizeDestinations(
  dests: Array<Static<typeof SyncDestinationSchema>> | undefined,
): Array<Static<typeof SyncDestinationSchema>> | undefined {
  if (!dests) return undefined;
  return dests.map((destination) => {
    const out: Static<typeof SyncDestinationSchema> = {
      ...destination,
      enabled: destination.enabled ?? true,
      id: String(destination.id).trim(),
    };
    if (typeof destination.rootPath === "string") out.rootPath = destination.rootPath.trim();
    return out;
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
      const destination = dests[i]!;
      const base = `sync.providers.${providerKey}.destinations.${i}`;
      validateNonEmptyTrimmed(`${base}.id`, destination.id, issues);
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
  if (issues.length > 0) return { ok: false, issues };

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
                paths: cfg.sync.sources.paths?.map((value) => String(value).trim()).filter((value) => value.length > 0),
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

  const model = normalized.journal?.semantic?.model;
  if (typeof model === "string" && model.trim().length === 0) {
    return { ok: false, issues: [{ path: "journal.semantic.model", message: "model must be non-empty" }] };
  }

  return { ok: true, config: normalized };
}

function formatIssues(issues: ConfigValidationIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}

function pickConfigExport(mod: unknown): unknown {
  if (mod && typeof mod === "object" && "default" in mod) {
    return (mod as { default: unknown }).default;
  }
  return mod;
}

async function loadRawrConfig(repoRoot: string): Promise<ConfigLoadResult> {
  const configPath = rawrConfigPath(repoRoot);
  let statInfo: { mtimeMs: number } | null = null;

  try {
    const stat = await fs.stat(configPath);
    if (!stat.isFile()) return { config: null, path: null, warnings: [] };
    statInfo = { mtimeMs: stat.mtimeMs };
  } catch {
    return { config: null, path: null, warnings: [] };
  }

  const warnings: string[] = [];
  try {
    const baseHref = pathToFileURL(configPath).href;
    const href = `${baseHref}?mtime=${encodeURIComponent(String(statInfo?.mtimeMs ?? Date.now()))}`;
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
  } catch (error) {
    return {
      config: null,
      path: configPath,
      warnings,
      error: { message: "Failed to load rawr.config.ts", cause: String(error) },
    };
  }
}

async function loadGlobalRawrConfig(): Promise<ConfigLoadResult> {
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
  } catch (error) {
    return {
      config: null,
      path: configPath,
      warnings,
      error: { message: "Failed to load ~/.rawr/config.json", cause: String(error) },
    };
  }
}

function mergeById<T extends { id: string }>(base: T[] | undefined, overlay: T[] | undefined): T[] | undefined {
  if (!base && !overlay) return undefined;
  const out: T[] = [];

  for (const item of base ?? []) out.push(item);
  for (const item of overlay ?? []) {
    const existingIndex = out.findIndex((value) => value.id === item.id);
    if (existingIndex >= 0) out[existingIndex] = { ...out[existingIndex], ...item };
    else out.push(item);
  }

  return out;
}

function uniqStrings(a: string[] | undefined, b: string[] | undefined): string[] | undefined {
  const all = [...(a ?? []), ...(b ?? [])].map((value) => value.trim()).filter(Boolean);
  if (all.length === 0) return undefined;
  return [...new Set(all)];
}

export function mergeRawrConfigLayers(input: {
  global: RawrConfig | null;
  workspace: RawrConfig | null;
}): RawrConfig | null {
  const global = input.global;
  const workspace = input.workspace;
  if (!global && !workspace) return null;

  const merged: RawrConfig = {
    version: 1,
    plugins: { ...(global?.plugins ?? {}), ...(workspace?.plugins ?? {}) },
    journal: { ...(global?.journal ?? {}), ...(workspace?.journal ?? {}) },
    server: { ...(global?.server ?? {}), ...(workspace?.server ?? {}) },
    sync: undefined,
  };

  const globalSync = global?.sync;
  const workspaceSync = workspace?.sync;
  if (globalSync || workspaceSync) {
    merged.sync = {
      ...(globalSync ?? {}),
      ...(workspaceSync ?? {}),
      defaults: { ...(globalSync?.defaults ?? {}), ...(workspaceSync?.defaults ?? {}) },
      sources: {
        paths: uniqStrings(globalSync?.sources?.paths, workspaceSync?.sources?.paths),
      },
      providers: {
        codex:
          globalSync?.providers?.codex || workspaceSync?.providers?.codex
            ? {
                ...(globalSync?.providers?.codex ?? {}),
                ...(workspaceSync?.providers?.codex ?? {}),
                destinations: mergeById(
                  globalSync?.providers?.codex?.destinations,
                  workspaceSync?.providers?.codex?.destinations,
                ),
              }
            : undefined,
        claude:
          globalSync?.providers?.claude || workspaceSync?.providers?.claude
            ? {
                ...(globalSync?.providers?.claude ?? {}),
                ...(workspaceSync?.providers?.claude ?? {}),
                destinations: mergeById(
                  globalSync?.providers?.claude?.destinations,
                  workspaceSync?.providers?.claude?.destinations,
                ),
              }
            : undefined,
      },
    };
  }

  const validated = validateRawrConfig(merged);
  if (validated.ok) return validated.config;
  return null;
}

async function loadRawrConfigLayered(repoRoot: string): Promise<ConfigLayeredResult> {
  const [global, workspace] = await Promise.all([loadGlobalRawrConfig(), loadRawrConfig(repoRoot)]);
  const merged = mergeRawrConfigLayers({ global: global.config, workspace: workspace.config });
  return { global, workspace, merged };
}

async function readGlobalConfig(): Promise<unknown> {
  const configPath = rawrGlobalConfigPath();
  try {
    return JSON.parse(await fs.readFile(configPath, "utf8")) as unknown;
  } catch {
    return { version: 1 };
  }
}

async function writeGlobalConfig(config: RawrConfig): Promise<void> {
  const configPath = rawrGlobalConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function createNodeConfigStore() {
  return {
    getWorkspaceConfig: loadRawrConfig,
    getGlobalConfig: loadGlobalRawrConfig,
    getLayeredConfig: loadRawrConfigLayered,
    async listGlobalSyncSources(): Promise<SyncSourcesResult> {
      const loaded = await loadGlobalRawrConfig();
      return {
        path: rawrGlobalConfigPath(),
        sources: loaded.config?.sync?.sources?.paths ?? [],
      };
    },
    async addGlobalSyncSource(sourcePath: string): Promise<SyncSourcesResult> {
      const rawConfig = await readGlobalConfig();
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

      await writeGlobalConfig(next);
      return {
        path: rawrGlobalConfigPath(),
        sources: next.sync.sources.paths,
      };
    },
    async removeGlobalSyncSource(sourcePath: string): Promise<SyncSourcesResult> {
      const rawConfig = await readGlobalConfig();
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

      await writeGlobalConfig(next);
      return {
        path: rawrGlobalConfigPath(),
        sources: next.sync.sources.paths,
      };
    },
  };
}
