import fs from "node:fs/promises";
import path from "node:path";
import {
  loadGlobalRawrConfig,
  loadRawrConfig,
  mergeRawrConfigLayers,
  rawrGlobalConfigPath,
  type RawrConfig,
  validateRawrConfig,
} from "./support";

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

export function createRepository(repoRoot: string) {
  return {
    async getWorkspaceConfig() {
      return await loadRawrConfig(repoRoot);
    },
    async getGlobalConfig() {
      return await loadGlobalRawrConfig();
    },
    async getLayeredConfig() {
      const [global, workspace] = await Promise.all([loadGlobalRawrConfig(), loadRawrConfig(repoRoot)]);
      const merged = mergeRawrConfigLayers({ global: global.config, workspace: workspace.config });
      return { global, workspace, merged };
    },
    async listGlobalSyncSources() {
      const loaded = await loadGlobalRawrConfig();
      return {
        path: rawrGlobalConfigPath(),
        sources: loaded.config?.sync?.sources?.paths ?? [],
      };
    },
    async addGlobalSyncSource(sourcePath: string) {
      const rawConfig = await readGlobalConfig();
      const validated = validateRawrConfig(rawConfig);
      if (!validated.ok) {
        throw new Error(`Invalid ~/.rawr/config.json: ${validated.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
      }

      const next: RawrConfig = validated.config;
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
    async removeGlobalSyncSource(sourcePath: string) {
      const rawConfig = await readGlobalConfig();
      const validated = validateRawrConfig(rawConfig);
      if (!validated.ok) {
        throw new Error(`Invalid ~/.rawr/config.json: ${validated.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
      }

      const next: RawrConfig = validated.config;
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
