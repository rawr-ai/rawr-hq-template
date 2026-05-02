import fs from "node:fs/promises";
import path from "node:path";

import { copyDirTree, ensureDir, writeJsonFile } from "./fs-utils";
import type { HostSourceContent, HostSourcePlugin } from "./types";

type CodexPluginManifest = {
  name: string;
  version: string;
  description: string;
  skills: string;
  mcpServers?: string;
  interface?: {
    displayName?: string;
    shortDescription?: string;
    category?: string;
    capabilities?: string[];
  };
};

type CodexMarketplaceManifest = {
  name: string;
  interface?: {
    displayName: string;
  };
  plugins: CodexMarketplacePluginEntry[];
};

type CodexMarketplacePluginEntry = {
  name: string;
  source: {
    source: "local";
    path: string;
  };
  policy: {
    installation: "AVAILABLE";
    authentication: "ON_INSTALL";
  };
  category?: string;
};

export type CodexPackageResult = {
  plugin: string;
  outDir: string;
  action: "planned" | "written";
  manifestPath: string;
  marketplaceName: string;
  marketplaceRoot: string;
  marketplacePath: string;
  marketplaceAction: "planned" | "written";
  marketplacePluginCount: number;
  skillCount: number;
  hookCount: number;
  mcpServerCount: number;
  assetCount: number;
  validationNotes: string[];
};

export async function packageCodexPlugin(input: {
  sourcePlugin: HostSourcePlugin;
  content: HostSourceContent;
  outDirAbs: string;
  dryRun: boolean;
  activePluginNames?: Iterable<string>;
  marketplaceName?: string;
  marketplaceDisplayName?: string;
  marketplaceCategory?: string;
  undoCapture?: {
    captureWriteTarget(target: string): Promise<void>;
  };
}): Promise<CodexPackageResult> {
  const marketplaceRoot = codexMarketplaceRootForPackageOutDir(input.outDirAbs);
  const packageRoot = codexPackageRootForMarketplaceRoot(input.outDirAbs, marketplaceRoot);
  const pluginDir = path.join(packageRoot, input.sourcePlugin.dirName);
  const manifestPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
  const marketplacePath = path.join(marketplaceRoot, ".agents", "plugins", "marketplace.json");
  const marketplaceName = normalizeMarketplaceName(
    input.marketplaceName ?? await inferMarketplaceName(input.sourcePlugin.absPath),
  );
  const marketplaceCategory = input.marketplaceCategory ?? input.sourcePlugin.rawrKind ?? "rawr";
  const manifest: CodexPluginManifest = {
    name: input.sourcePlugin.dirName,
    version: input.sourcePlugin.version ?? "1.0.0",
    description: input.sourcePlugin.description ?? "Synced from RAWR HQ",
    skills: "./skills/",
    interface: {
      displayName: input.sourcePlugin.dirName,
      shortDescription: input.sourcePlugin.description ?? "Synced from RAWR HQ",
      category: marketplaceCategory,
      capabilities: [
        ...(input.content.skills.length > 0 ? ["skills"] : []),
        ...((input.content.mcpServers ?? []).length > 0 ? ["mcp"] : []),
      ],
    },
  };
  const mcpServers = input.content.mcpServers ?? [];
  const assets = input.content.assets ?? [];
  if (mcpServers.length > 0) manifest.mcpServers = "./.mcp.json";

  if (!input.dryRun) {
    if (input.activePluginNames) {
      await pruneInactiveCodexPackageDirs({
        packageRoot,
        activePluginNames: input.activePluginNames,
      });
    }

    await input.undoCapture?.captureWriteTarget(pluginDir);
    await fs.rm(pluginDir, { recursive: true, force: true });
    await ensureDir(path.dirname(manifestPath));
    await writeJsonFile(manifestPath, manifest);

    for (const skill of input.content.skills) {
      const skillDir = path.join(pluginDir, "skills", skill.name);
      await ensureDir(skillDir);
      await copyDirTree(skill.absPath, skillDir);
    }

    if (mcpServers.length > 0) {
      await writeCodexMcpConfig({ pluginDir, mcpServers });
    }

    for (const asset of assets) {
      const assetPath = path.join(pluginDir, "assets", asset.name);
      await ensureDir(path.dirname(assetPath));
      await fs.copyFile(asset.absPath, assetPath);
    }

    const unsupportedDirs = ["agents", "hooks", "settings"];
    for (const dir of unsupportedDirs) {
      await fs.rm(path.join(pluginDir, dir), { recursive: true, force: true });
    }

    await input.undoCapture?.captureWriteTarget(marketplacePath);
    await upsertCodexMarketplaceManifest({
      marketplaceName,
      marketplaceRoot,
      marketplacePath,
      sourcePlugin: input.sourcePlugin,
      pluginDir,
      activePluginNames: input.activePluginNames,
      displayName: input.marketplaceDisplayName,
      category: marketplaceCategory,
    });
  }

  const marketplacePluginCount = input.dryRun
    ? 1
    : ((await readCodexMarketplaceManifest(marketplacePath))?.plugins.length ?? 1);

  return {
    plugin: input.sourcePlugin.dirName,
    outDir: pluginDir,
    action: input.dryRun ? "planned" : "written",
    manifestPath,
    marketplaceName,
    marketplaceRoot,
    marketplacePath,
    marketplaceAction: input.dryRun ? "planned" : "written",
    marketplacePluginCount,
    skillCount: input.content.skills.length,
    hookCount: 0,
    mcpServerCount: mcpServers.length,
    assetCount: assets.length,
    validationNotes: [
      "Codex package generation writes an installable local marketplace root",
      "Marketplace registration uses `codex plugin marketplace add`; plugin installation uses Codex app-server `plugin/install`",
      "Skills, MCP config, and assets are packaged when modeled by RAWR source content",
      "Hook scripts/config are omitted from Codex plugin packages because the current RAWR Codex plugin manifest does not accept a hooks field; direct Codex sync owns hook projection",
      "Custom agents and settings are intentionally omitted from Codex plugin packages because the current RAWR Codex plugin manifest does not accept them",
    ],
  };
}

async function upsertCodexMarketplaceManifest(input: {
  marketplaceName: string;
  marketplaceRoot: string;
  marketplacePath: string;
  sourcePlugin: HostSourcePlugin;
  pluginDir: string;
  activePluginNames?: Iterable<string>;
  displayName?: string;
  category?: string;
}): Promise<void> {
  const currentEntry = codexMarketplacePluginEntry({
    marketplaceRoot: input.marketplaceRoot,
    pluginDir: input.pluginDir,
    pluginName: input.sourcePlugin.dirName,
    category: input.category,
  });
  const existing = await readCodexMarketplaceManifest(input.marketplacePath);
  const activePluginNames = input.activePluginNames ? new Set(input.activePluginNames) : null;
  const entries = new Map<string, CodexMarketplacePluginEntry>();

  for (const entry of existing?.plugins ?? []) {
    if (entry.name === currentEntry.name) continue;
    if (activePluginNames && !activePluginNames.has(entry.name)) continue;
    if (!(await localMarketplaceSourceExists(input.marketplaceRoot, entry))) continue;
    entries.set(entry.name, entry);
  }

  entries.set(currentEntry.name, currentEntry);
  const plugins = [...entries.values()].sort((left, right) => left.name.localeCompare(right.name));
  const manifest: CodexMarketplaceManifest = {
    name: input.marketplaceName,
    ...(input.displayName ? { interface: { displayName: input.displayName } } : {}),
    plugins,
  };

  await writeJsonFile(input.marketplacePath, manifest);
}

async function pruneInactiveCodexPackageDirs(input: {
  packageRoot: string;
  activePluginNames: Iterable<string>;
}): Promise<void> {
  const activePluginNames = new Set(input.activePluginNames);
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = await fs.readdir(input.packageRoot, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(entries
    .filter((entry) => entry.isDirectory() && !activePluginNames.has(entry.name))
    .map((entry) => fs.rm(path.join(input.packageRoot, entry.name), { recursive: true, force: true })));
}

async function readCodexMarketplaceManifest(filePath: string): Promise<CodexMarketplaceManifest | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<CodexMarketplaceManifest>;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.plugins)) return null;
    return {
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : "rawr",
      interface: parsed.interface,
      plugins: parsed.plugins.filter(isCodexMarketplacePluginEntry),
    };
  } catch {
    return null;
  }
}

function isCodexMarketplacePluginEntry(value: unknown): value is CodexMarketplacePluginEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const source = record.source as Record<string, unknown> | undefined;
  const policy = record.policy as Record<string, unknown> | undefined;
  return (
    typeof record.name === "string" &&
    (record.category === undefined || typeof record.category === "string") &&
    !!source &&
    source.source === "local" &&
    typeof source.path === "string" &&
    !!policy &&
    policy.installation === "AVAILABLE" &&
    policy.authentication === "ON_INSTALL"
  );
}

async function localMarketplaceSourceExists(
  marketplaceRoot: string,
  entry: CodexMarketplacePluginEntry,
): Promise<boolean> {
  const sourcePath = entry.source.path;
  if (!sourcePath.startsWith("./")) return false;
  const relativePath = sourcePath.slice(2);
  if (!relativePath || path.isAbsolute(relativePath)) return false;
  const parts = relativePath.split(/[\\/]+/);
  if (parts.some((part) => !part || part === "." || part === "..")) return false;
  try {
    const stat = await fs.stat(path.join(marketplaceRoot, ...parts));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function codexMarketplaceRootForPackageOutDir(outDirAbs: string): string {
  return path.basename(outDirAbs) === "plugins" ? path.dirname(outDirAbs) : outDirAbs;
}

function codexMarketplacePluginEntry(input: {
  marketplaceRoot: string;
  pluginDir: string;
  pluginName: string;
  category?: string;
}): CodexMarketplacePluginEntry {
  const relativePath = path.relative(input.marketplaceRoot, input.pluginDir).split(path.sep).join("/");
  return {
    name: input.pluginName,
    source: {
      source: "local",
      path: `./${relativePath}`,
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    },
    ...(input.category ? { category: input.category } : {}),
  };
}

function codexPackageRootForMarketplaceRoot(outDirAbs: string, marketplaceRoot: string): string {
  return path.basename(outDirAbs) === "plugins" ? outDirAbs : path.join(marketplaceRoot, "plugins");
}

async function inferMarketplaceName(sourcePluginPath: string): Promise<string> {
  let current = path.dirname(sourcePluginPath);
  while (true) {
    const packageJsonPath = path.join(current, "package.json");
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8")) as Record<string, unknown>;
      if (typeof packageJson.name === "string" && packageJson.workspaces) {
        return packageJson.name;
      }
    } catch {
      // Keep walking until we find a workspace package root.
    }

    const parent = path.dirname(current);
    if (parent === current) return "rawr";
    current = parent;
  }
}

function normalizeMarketplaceName(name: string): string {
  const normalized = name
    .trim()
    .replace(/^@/, "")
    .replace(/\//g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return normalized || "rawr";
}

async function writeCodexMcpConfig(input: {
  pluginDir: string;
  mcpServers: Array<{ name: string; absPath: string }>;
}): Promise<void> {
  const directConfig = input.mcpServers.find((server) => path.basename(server.name) === ".mcp.json");
  const mcpDir = path.join(input.pluginDir, "mcp");
  const generatedConfig: Record<string, { command: string; args: string[] }> = {};
  await ensureDir(mcpDir);

  for (const server of input.mcpServers.filter((server) => path.basename(server.name) !== ".mcp.json")) {
    const target = path.join(mcpDir, server.name);
    await ensureDir(path.dirname(target));
    await fs.copyFile(server.absPath, target);
    generatedConfig[normalizeComponentName(server.name)] = {
      command: commandForExecutable(server.name),
      args: [`./mcp/${server.name}`],
    };
  }

  if (directConfig) {
    await fs.copyFile(directConfig.absPath, path.join(input.pluginDir, ".mcp.json"));
    return;
  }

  await writeJsonFile(path.join(input.pluginDir, ".mcp.json"), generatedConfig);
}

function normalizeComponentName(name: string): string {
  return path.basename(name).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
}

function commandForExecutable(name: string): string {
  const ext = path.extname(name);
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return "node";
  if (ext === ".py") return "python3";
  if (ext === ".sh") return "bash";
  return "sh";
}
