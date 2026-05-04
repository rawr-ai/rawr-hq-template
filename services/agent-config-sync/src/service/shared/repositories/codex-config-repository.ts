import { parse, stringify } from "smol-toml";
import type { ContentFile, SourceContent, SourcePlugin } from "../entities";
import type { AgentConfigSyncResources } from "../resources";

type JsonRecord = Record<string, unknown>;

export type CodexManagedConfigProjection = {
  configPath: string;
  content: string | null;
  sourcePaths: string[];
  conflictMessages: string[];
  validationNotes: string[];
};

export async function buildCodexManagedConfig(input: {
  codexHome: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  force: boolean;
  mcpRuntimeDir?: string;
  pruneMcpServerNames?: string[];
  resources: AgentConfigSyncResources;
}): Promise<CodexManagedConfigProjection> {
  const pathOps = input.resources.path;
  const configPath = pathOps.join(input.codexHome, "config.toml");
  const sourcePaths: string[] = [];
  const validationNotes: string[] = [];
  const managed: JsonRecord = {};

  for (const setting of input.content.settings ?? []) {
    if (!setting.name.endsWith(".toml")) {
      validationNotes.push(`Skipped non-TOML Codex settings fragment: ${setting.name}`);
      continue;
    }
    const parsed = await readTomlRecord(setting.absPath, input.resources);
    if (!parsed) {
      validationNotes.push(`Skipped unreadable Codex settings fragment: ${setting.name}`);
      continue;
    }
    sourcePaths.push(setting.absPath);
    deepMerge(managed, parsed);
  }

  if ((input.content.hooks ?? []).length > 0 || (input.content.hookConfigs ?? []).length > 0) {
    sourcePaths.push(
      ...(input.content.hooks ?? []).map((hook) => hook.absPath),
      ...(input.content.hookConfigs ?? []).map((hookConfig) => hookConfig.absPath),
    );
    deepMerge(managed, { features: { codex_hooks: true } });
  }

  const mcpServers = await buildMcpServers({
    pluginName: input.sourcePlugin.dirName,
    mcpFiles: input.content.mcpServers ?? [],
    mcpRuntimeDir: input.mcpRuntimeDir,
    resources: input.resources,
  });
  if (Object.keys(mcpServers).length > 0) {
    sourcePaths.push(...(input.content.mcpServers ?? []).map((server) => server.absPath));
    deepMerge(managed, { mcp_servers: mcpServers });
  }

  const hasManagedContent = Object.keys(managed).length > 0;
  const pruneMcpServerNames = input.pruneMcpServerNames ?? [];

  if (!hasManagedContent && pruneMcpServerNames.length === 0) {
    return { configPath, content: null, sourcePaths, conflictMessages: [], validationNotes };
  }

  const existingText = await input.resources.files.readTextFile(configPath);
  let existing: JsonRecord = {};
  if (existingText) {
    try {
      existing = parseTomlRecord(existingText, configPath);
    } catch (err) {
      if (!input.force) {
        return {
          configPath,
          content: null,
          sourcePaths,
          conflictMessages: [err instanceof Error ? err.message : String(err)],
          validationNotes,
        };
      }
      validationNotes.push(`Replaced unreadable Codex config because force was enabled: ${configPath}`);
    }
  }
  const next = deepCloneRecord(existing);
  const pruned = pruneMcpServers(next, input.sourcePlugin.dirName, pruneMcpServerNames);
  if (!hasManagedContent && !pruned) {
    return { configPath, content: null, sourcePaths, conflictMessages: [], validationNotes };
  }
  const conflictMessages = input.force ? [] : collectConflicts(next, managed);
  deepMerge(next, managed);
  const rendered = stringify(next);

  return {
    configPath,
    content: rendered.endsWith("\n") ? rendered : `${rendered}\n`,
    sourcePaths,
    conflictMessages,
    validationNotes,
  };
}

async function readTomlRecord(filePath: string, resources: AgentConfigSyncResources): Promise<JsonRecord | null> {
  const raw = await resources.files.readTextFile(filePath);
  if (!raw) return null;
  return parseTomlRecord(raw, filePath);
}

function parseTomlRecord(raw: string, source: string): JsonRecord {
  const parsed = parse(raw);
  if (!isRecord(parsed)) throw new Error(`Codex TOML config is not an object: ${source}`);
  return parsed;
}

async function buildMcpServers(input: {
  pluginName: string;
  mcpFiles: ContentFile[];
  mcpRuntimeDir?: string;
  resources: AgentConfigSyncResources;
}): Promise<JsonRecord> {
  const servers: JsonRecord = {};

  for (const file of input.mcpFiles) {
    if (file.name.endsWith(".json")) {
      const json = await input.resources.files.readJsonFile<unknown>(file.absPath);
      if (isRecord(json)) {
        deepMerge(servers, extractMcpServersFromRecord(file, json));
      }
      continue;
    }

    if (file.name.endsWith(".toml")) {
      const parsed = await readTomlRecord(file.absPath, input.resources);
      if (parsed) deepMerge(servers, extractMcpServersFromRecord(file, parsed));
      continue;
    }

    const runtimePath = input.mcpRuntimeDir
      ? input.resources.path.join(input.mcpRuntimeDir, file.name)
      : file.absPath;
    servers[buildCodexMcpServerName(input.pluginName, file.name)] = commandSpecForExecutable(runtimePath, input.resources);
  }

  return servers;
}

function extractMcpServersFromRecord(file: ContentFile, record: JsonRecord): JsonRecord {
  if (isRecord(record.mcpServers)) return record.mcpServers;
  if (isRecord(record.mcp_servers)) return record.mcp_servers;
  if (typeof record.command === "string" || typeof record.url === "string") {
    return { [buildCodexMcpServerName("", file.name)]: record };
  }
  return {};
}

export function buildCodexMcpServerName(pluginName: string, sourceName: string): string {
  const withoutExt = sourceName.replace(/\.[^/.]+$/, "");
  const raw = [pluginName, withoutExt].filter(Boolean).join("_");
  return raw.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "rawr_mcp";
}

function pruneMcpServers(config: JsonRecord, pluginName: string, sourceNames: string[]): boolean {
  let changed = false;
  const keys = new Set(sourceNames.map((sourceName) => buildCodexMcpServerName(pluginName, sourceName)));
  for (const rootKey of ["mcp_servers", "mcpServers"]) {
    const section = config[rootKey];
    if (!isRecord(section)) continue;
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(section, key)) {
        delete section[key];
        changed = true;
      }
    }
    if (Object.keys(section).length === 0) delete config[rootKey];
  }
  return changed;
}

function commandSpecForExecutable(absPath: string, resources: AgentConfigSyncResources): JsonRecord {
  const ext = resources.path.extname(absPath);
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return { command: "node", args: [absPath] };
  if (ext === ".py") return { command: "python3", args: [absPath] };
  if (ext === ".sh") return { command: "bash", args: [absPath] };
  return { command: absPath };
}

function collectConflicts(existing: JsonRecord, managed: JsonRecord, prefix: string[] = []): string[] {
  const conflicts: string[] = [];
  for (const [key, nextValue] of Object.entries(managed)) {
    const currentPath = [...prefix, key];
    const existingValue = existing[key];
    if (isRecord(existingValue) && isRecord(nextValue)) {
      conflicts.push(...collectConflicts(existingValue, nextValue, currentPath));
      continue;
    }
    if (typeof existingValue === "undefined") continue;
    if (!stableEqual(existingValue, nextValue)) {
      conflicts.push(`Codex config key '${currentPath.join(".")}' differs; use --force to overwrite`);
    }
  }
  return conflicts;
}

function deepMerge(target: JsonRecord, source: JsonRecord): JsonRecord {
  for (const [key, value] of Object.entries(source)) {
    if (isRecord(target[key]) && isRecord(value)) {
      deepMerge(target[key], value);
      continue;
    }
    target[key] = deepClone(value);
  }
  return target;
}

function deepCloneRecord(input: JsonRecord): JsonRecord {
  return deepClone(input) as JsonRecord;
}

function deepClone(input: unknown): unknown {
  if (Array.isArray(input)) return input.map((item) => deepClone(item));
  if (isRecord(input)) {
    const next: JsonRecord = {};
    for (const [key, value] of Object.entries(input)) next[key] = deepClone(value);
    return next;
  }
  return input;
}

function stableEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(deepClone(left)) === JSON.stringify(deepClone(right));
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
