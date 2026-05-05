import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import type { ExecFn } from "./claude-cli";
import { resolveInstallScope, type InstallScope } from "./install-scope";

export type CodexInstallAction =
  | {
      action: "planned";
      codexBin: string;
      codexHome?: string;
      installScope: InstallScope;
      marketplaceRoot: string;
      marketplacePath: string;
      plugin: string;
    }
  | {
      action: "preflight";
      codexBin: string;
      codexHome?: string;
      installScope: InstallScope;
      version: string;
    }
  | {
      action: "marketplace-registered";
      codexBin: string;
      codexHome?: string;
      installScope: InstallScope;
      marketplaceRoot: string;
      marketplacePath: string;
    }
  | {
      action: "installed";
      codexBin: string;
      codexHome?: string;
      installScope: InstallScope;
      marketplacePath: string;
      plugin: string;
      authPolicy?: string;
      appsNeedingAuth: number;
    }
  | {
      action: "verified";
      codexBin: string;
      codexHome?: string;
      installScope: InstallScope;
      marketplacePath: string;
      plugin: string;
      installed: boolean;
      enabled: boolean;
      skillCount: number;
      visibleSkillCount: number;
      visiblePluginSkillCount: number;
      mcpServerCount: number;
      hookCount: number;
      providerHookCount: number;
      pluginHooksFeatureRequired: boolean;
      packagedSupport: {
        agentCount: number;
        settingsCount: number;
      };
    }
  | {
      action: "skipped";
      codexBin?: string;
      codexHome?: string;
      installScope?: InstallScope;
      marketplacePath?: string;
      plugin?: string;
      reason: string;
    }
  | {
      action: "failed";
      codexBin?: string;
      codexHome?: string;
      installScope?: InstallScope;
      marketplacePath?: string;
      plugin?: string;
      error: string;
    };

export type CodexInstallResult = {
  ok: boolean;
  codexBin: string;
  codexHome?: string;
  installScope: InstallScope;
  marketplaceRoot: string;
  marketplacePath: string;
  actions: CodexInstallAction[];
};

export type CodexAppServerSession = {
  initialize(): Promise<void>;
  pluginList(params: { cwds?: string[] }): Promise<Record<string, unknown>>;
  pluginRead(params: { marketplacePath: string; pluginName: string }): Promise<Record<string, unknown>>;
  pluginInstall(params: { marketplacePath: string; pluginName: string }): Promise<Record<string, unknown>>;
  pluginUninstall?(params: { pluginId: string }): Promise<Record<string, unknown>>;
  skillsList(params: { cwds: string[]; forceReload: boolean }): Promise<Record<string, unknown>>;
  hooksList?(params: { cwds: string[] }): Promise<Record<string, unknown>>;
  close(): Promise<void>;
};

export function resolveCodexBin(input?: {
  codexBin?: string;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}): string {
  const env = input?.env ?? process.env;
  const homeDir = input?.homeDir ?? (env.HOME ? String(env.HOME) : os.homedir());
  const explicit = input?.codexBin?.trim();
  if (explicit) return expandHome(explicit, homeDir);
  const configured = env.RAWR_CODEX_BIN?.trim();
  if (configured) return expandHome(configured, homeDir);
  const rawrCodexBin = path.join(homeDir, ".local", "bin", "codex");
  return existsSync(rawrCodexBin) ? rawrCodexBin : "codex";
}

export async function installCodexMarketplacePlugins(input: {
  codexBin?: string;
  codexHome?: string;
  installScope?: InstallScope | string;
  marketplaceRoot: string;
  marketplacePath: string;
  plugins: string[];
  dryRun: boolean;
  exec?: ExecFn;
  appServer?: CodexAppServerSession;
}): Promise<CodexInstallResult> {
  const codexBin = resolveCodexBin({ codexBin: input.codexBin });
  const installScope = resolveInstallScope(input.installScope);
  const env = codexEnv(input.codexHome);
  const actions: CodexInstallAction[] = [];
  const uniquePlugins = [...new Set(input.plugins)].sort();

  if (uniquePlugins.length === 0) {
    return {
      ok: true,
      codexBin,
      codexHome: input.codexHome,
      installScope,
      marketplaceRoot: input.marketplaceRoot,
      marketplacePath: input.marketplacePath,
      actions: [{ action: "skipped", codexBin, codexHome: input.codexHome, installScope, reason: "no Codex packages to install" }],
    };
  }

  if (input.dryRun) {
    return {
      ok: true,
      codexBin,
      codexHome: input.codexHome,
      installScope,
      marketplaceRoot: input.marketplaceRoot,
      marketplacePath: input.marketplacePath,
      actions: uniquePlugins.map((plugin) => ({
        action: "planned",
        codexBin,
        codexHome: input.codexHome,
        installScope,
        marketplaceRoot: input.marketplaceRoot,
        marketplacePath: input.marketplacePath,
        plugin,
      })),
    };
  }

  const exec = input.exec ?? defaultExec;

  try {
    if (input.codexHome) {
      await fs.mkdir(input.codexHome, { recursive: true });
    }

    const version = await requireSuccessfulCommand(exec, {
      cmd: codexBin,
      args: ["--version"],
      env,
      label: "codex --version",
    });
    await requireSuccessfulCommand(exec, {
      cmd: codexBin,
      args: ["plugin", "marketplace", "--help"],
      env,
      label: "codex plugin marketplace --help",
    });
    await requireSuccessfulCommand(exec, {
      cmd: codexBin,
      args: ["app-server", "--help"],
      env,
      label: "codex app-server --help",
    });
    const packageMetadataByPlugin = new Map(
      await Promise.all(uniquePlugins.map(async (plugin) => [
        plugin,
        await readCodexPackageMetadata({
          marketplaceRoot: input.marketplaceRoot,
          marketplacePath: input.marketplacePath,
          plugin,
        }),
      ] as const)),
    );
    const requiresPluginHooks = [...packageMetadataByPlugin.values()]
      .some((metadata) => metadata.hookHandlerCount > 0);
    actions.push({
      action: "preflight",
      codexBin,
      codexHome: input.codexHome,
      installScope,
      version: version.trim(),
    });

    // TODO: pass an explicit Codex install scope only after RAWR Codex exposes
    // one. Today user scope is represented by the selected CODEX_HOME.
    await requireSuccessfulCommand(exec, {
      cmd: codexBin,
      args: ["plugin", "marketplace", "add", input.marketplaceRoot],
      env,
      label: "codex plugin marketplace add",
    });
    actions.push({
      action: "marketplace-registered",
      codexBin,
      codexHome: input.codexHome,
      installScope,
      marketplaceRoot: input.marketplaceRoot,
      marketplacePath: input.marketplacePath,
    });

    const appServer = input.appServer ?? await startCodexAppServer({
      codexBin,
      codexHome: input.codexHome,
      enablePluginHooks: requiresPluginHooks,
    });
    try {
      await appServer.initialize();
      await appServer.pluginList({ cwds: [input.marketplaceRoot] });

      for (const plugin of uniquePlugins) {
        const packageMetadata = packageMetadataByPlugin.get(plugin) ?? {
          hookHandlerCount: 0,
          agentCount: 0,
          settingsCount: 0,
        };
        await appServer.pluginRead({ marketplacePath: input.marketplacePath, pluginName: plugin });
        const installResponse = await appServer.pluginInstall({
          marketplacePath: input.marketplacePath,
          pluginName: plugin,
        });
        actions.push({
          action: "installed",
          codexBin,
          codexHome: input.codexHome,
          installScope,
          marketplacePath: input.marketplacePath,
          plugin,
          authPolicy: stringField(installResponse, "authPolicy"),
          appsNeedingAuth: Array.isArray(installResponse.appsNeedingAuth)
            ? installResponse.appsNeedingAuth.length
            : 0,
        });

        const listResponse = await appServer.pluginList({ cwds: [input.marketplaceRoot] });
        const detail = await appServer.pluginRead({ marketplacePath: input.marketplacePath, pluginName: plugin });
        const skillsResponse = await appServer.skillsList({ cwds: [input.marketplaceRoot], forceReload: true });
        const summary = findPluginSummary(listResponse, input.marketplacePath, plugin);
        let providerHookCount = 0;
        if (packageMetadata.hookHandlerCount > 0) {
          if (!appServer.hooksList) {
            actions.push({
              action: "failed",
              codexBin,
              codexHome: input.codexHome,
              installScope,
              marketplacePath: input.marketplacePath,
              plugin,
              error: [
                `Codex package '${plugin}' includes ${packageMetadata.hookHandlerCount} lifecycle hook handler(s),`,
                "but this Codex app-server does not expose hooks/list for provider-visible hook verification.",
                "Use a Codex provider with plugin-bundled hook support, or pass --codex-bin to a newer native Codex binary.",
              ].join(" "),
            });
            continue;
          }
          const hooksResponse = await appServer.hooksList({ cwds: [input.marketplaceRoot] });
          providerHookCount = countProviderPluginHooks(
            hooksResponse,
            stringField(summary ?? {}, "id") ?? `${plugin}@${packageMetadata.marketplaceName ?? ""}`,
          );
        }
        if (packageMetadata.hookHandlerCount > 0 && providerHookCount < packageMetadata.hookHandlerCount) {
          actions.push({
            action: "failed",
            codexBin,
            codexHome: input.codexHome,
            installScope,
            marketplacePath: input.marketplacePath,
            plugin,
            error: [
              `Codex package '${plugin}' includes ${packageMetadata.hookHandlerCount} lifecycle hook handler(s),`,
              `but provider hooks/list exposed ${providerHookCount} enabled plugin hook handler(s) for this plugin.`,
              "Use a Codex provider with plugin-bundled hook support and the plugin_hooks feature enabled before treating native Codex deployment as parity.",
            ].join(" "),
          });
          continue;
        }
        actions.push({
          action: "verified",
          codexBin,
          codexHome: input.codexHome,
          installScope,
          marketplacePath: input.marketplacePath,
          plugin,
          installed: summary?.installed === true,
          enabled: summary?.enabled === true,
          skillCount: pluginDetailArrayLength(detail, "skills"),
          visibleSkillCount: skillsListSkillCount(skillsResponse),
          visiblePluginSkillCount: skillsListVisiblePluginSkillCount(skillsResponse, pluginDetailStringArray(detail, "skills")),
          mcpServerCount: pluginDetailArrayLength(detail, "mcpServers"),
          hookCount: packageMetadata.hookHandlerCount,
          providerHookCount,
          pluginHooksFeatureRequired: packageMetadata.hookHandlerCount > 0,
          packagedSupport: {
            agentCount: packageMetadata.agentCount,
            settingsCount: packageMetadata.settingsCount,
          },
        });
      }
    } finally {
      await appServer.close();
    }
  } catch (err) {
    actions.push({
      action: "failed",
      codexBin,
      codexHome: input.codexHome,
      installScope,
      marketplacePath: input.marketplacePath,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    ok: !actions.some((action) => action.action === "failed"),
    codexBin,
    codexHome: input.codexHome,
    installScope,
    marketplaceRoot: input.marketplaceRoot,
    marketplacePath: input.marketplacePath,
    actions,
  };
}

const defaultExec: ExecFn = async ({ cmd, args, cwd, env }) => {
  const child = spawn(cmd, args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const code = await new Promise<number>((resolve) => child.on("close", resolve));
  return { code, stdout, stderr };
};

async function requireSuccessfulCommand(
  exec: ExecFn,
  input: {
    cmd: string;
    args: string[];
    env: NodeJS.ProcessEnv;
    label: string;
  },
): Promise<string> {
  const result = await exec({ cmd: input.cmd, args: input.args, env: input.env });
  if (result.code !== 0) {
    throw new Error(`${input.label} failed (code=${result.code}): ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim() || result.stderr.trim();
}

async function startCodexAppServer(input: {
  codexBin: string;
  codexHome?: string;
  enablePluginHooks?: boolean;
}): Promise<CodexAppServerSession> {
  const args = ["app-server", "--listen", "stdio://", "--enable", "plugins"];
  if (input.enablePluginHooks) args.push("--enable", "plugin_hooks");
  const child = spawn(input.codexBin, args, {
    env: codexEnv(input.codexHome),
    stdio: ["pipe", "pipe", "pipe"],
  });
  return new JsonRpcCodexAppServerSession(child);
}

class JsonRpcCodexAppServerSession implements CodexAppServerSession {
  private nextId = 1;
  private readonly lines: readline.Interface;
  private readonly stdin: NodeJS.WritableStream;
  private readonly pending: string[] = [];
  private readonly waiters: Array<(line: string) => void> = [];
  private stderr = "";

  constructor(private readonly child: ReturnType<typeof spawn>) {
    if (!child.stdin || !child.stdout || !child.stderr) {
      throw new Error("codex app-server did not expose stdio pipes");
    }
    this.stdin = child.stdin;
    this.lines = readline.createInterface({ input: child.stdout });
    this.lines.on("line", (line) => {
      const waiter = this.waiters.shift();
      if (waiter) waiter(line);
      else this.pending.push(line);
    });
    child.stderr.on("data", (chunk) => {
      this.stderr += String(chunk);
    });
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      clientInfo: {
        name: "rawr-agent-config-sync",
        version: "0.1.0",
      },
      capabilities: {
        experimentalApi: true,
      },
    });
    await this.notify("initialized");
  }

  pluginList(params: { cwds?: string[] }): Promise<Record<string, unknown>> {
    return this.request("plugin/list", { cwds: params.cwds ?? [] });
  }

  pluginRead(params: { marketplacePath: string; pluginName: string }): Promise<Record<string, unknown>> {
    return this.request("plugin/read", {
      marketplacePath: params.marketplacePath,
      pluginName: params.pluginName,
    });
  }

  pluginInstall(params: { marketplacePath: string; pluginName: string }): Promise<Record<string, unknown>> {
    return this.request("plugin/install", {
      marketplacePath: params.marketplacePath,
      pluginName: params.pluginName,
    });
  }

  pluginUninstall(params: { pluginId: string }): Promise<Record<string, unknown>> {
    return this.request("plugin/uninstall", {
      pluginId: params.pluginId,
    });
  }

  skillsList(params: { cwds: string[]; forceReload: boolean }): Promise<Record<string, unknown>> {
    return this.request("skills/list", {
      cwds: params.cwds,
      forceReload: params.forceReload,
    });
  }

  hooksList(params: { cwds: string[] }): Promise<Record<string, unknown>> {
    return this.request("hooks/list", {
      cwds: params.cwds,
    });
  }

  async close(): Promise<void> {
    this.lines.close();
    if (!this.child.killed) this.child.kill();
    await new Promise<void>((resolve) => {
      this.child.once("close", () => resolve());
      setTimeout(resolve, 100);
    });
  }

  private async request(method: string, params?: unknown): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    this.write({ method, id, ...(params === undefined ? {} : { params }) });
    while (true) {
      const message = JSON.parse(await this.readLine()) as Record<string, unknown>;
      if (message.id !== id) continue;
      if (message.error) throw new Error(`${method} failed: ${JSON.stringify(message.error)}`);
      return asRecord(message.result);
    }
  }

  private async notify(method: string, params?: unknown): Promise<void> {
    this.write({ method, ...(params === undefined ? {} : { params }) });
  }

  private write(message: Record<string, unknown>): void {
    this.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private readLine(): Promise<string> {
    const line = this.pending.shift();
    if (line !== undefined) return Promise.resolve(line);
    if (this.child.exitCode !== null) {
      return Promise.reject(new Error(`codex app-server exited early: ${this.stderr}`));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`timed out waiting for codex app-server response: ${this.stderr}`));
      }, 15000);
      this.waiters.push((line) => {
        clearTimeout(timer);
        resolve(line);
      });
    });
  }
}

function findPluginSummary(
  response: Record<string, unknown>,
  marketplacePath: string,
  pluginName: string,
): Record<string, unknown> | null {
  const marketplaces = Array.isArray(response.marketplaces) ? response.marketplaces : [];
  let fallback: Record<string, unknown> | null = null;
  for (const marketplace of marketplaces) {
    const record = asRecord(marketplace);
    const plugins = Array.isArray(record.plugins) ? record.plugins : [];
    for (const plugin of plugins) {
      const pluginRecord = asRecord(plugin);
      if (pluginRecord.name !== pluginName) continue;
      if (record.path === marketplacePath) return pluginRecord;
      fallback ??= pluginRecord;
    }
  }
  return fallback;
}

function pluginDetailArrayLength(response: Record<string, unknown>, key: string): number {
  const plugin = asRecord(response.plugin);
  const value = plugin[key];
  return Array.isArray(value) ? value.length : 0;
}

function pluginDetailStringArray(response: Record<string, unknown>, key: string): string[] {
  const plugin = asRecord(response.plugin);
  const value = plugin[key];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      return stringField(record, "name") ?? stringField(record, "id") ?? stringField(record, "slug");
    })
    .filter((item): item is string => typeof item === "string" && item.length > 0);
}

function skillsListSkillCount(response: Record<string, unknown>): number {
  const data = Array.isArray(response.data) ? response.data : [];
  return data.reduce((sum, item) => {
    const record = asRecord(item);
    const skills = Array.isArray(record.skills) ? record.skills : [];
    return sum + skills.length;
  }, 0);
}

function skillsListVisiblePluginSkillCount(response: Record<string, unknown>, expectedSkillNames: string[]): number {
  const expected = new Set(expectedSkillNames);
  if (expected.size === 0) return 0;
  const visible = new Set<string>();
  const data = Array.isArray(response.data) ? response.data : [];
  for (const item of data) {
    const record = asRecord(item);
    const skills = Array.isArray(record.skills) ? record.skills : [];
    for (const skill of skills) {
      const skillRecord = asRecord(skill);
      const name = stringField(skillRecord, "name") ?? stringField(skillRecord, "id") ?? stringField(skillRecord, "slug");
      if (name && expected.has(name)) visible.add(name);
    }
  }
  return visible.size;
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

async function readCodexPackageMetadata(input: {
  marketplaceRoot: string;
  marketplacePath: string;
  plugin: string;
}): Promise<{
  pluginDir?: string;
  marketplaceName?: string;
  version?: string;
  hookHandlerCount: number;
  agentCount: number;
  settingsCount: number;
}> {
  const marketplace = await readJsonFile<Record<string, unknown>>(input.marketplacePath);
  const plugins = Array.isArray(marketplace?.plugins) ? marketplace.plugins : [];
  const entry = plugins.map(asRecord).find((plugin) => plugin.name === input.plugin);
  const source = asRecord(entry?.source);
  const relativeSource = typeof source.path === "string" && source.path.startsWith("./")
    ? source.path.slice(2)
    : null;
  if (!relativeSource) return { hookHandlerCount: 0, agentCount: 0, settingsCount: 0 };

  const pluginDir = path.join(input.marketplaceRoot, ...relativeSource.split(/[\\/]+/));
  const manifest = await readJsonFile<Record<string, unknown>>(path.join(pluginDir, ".codex-plugin", "plugin.json"));
  const version = typeof manifest?.version === "string" ? manifest.version : undefined;
  const hookConfigPaths = await resolveCodexHookConfigPaths({ pluginDir, manifest });
  return {
    pluginDir,
    marketplaceName: typeof marketplace?.name === "string" ? marketplace.name : undefined,
    version,
    hookHandlerCount: await countCodexHookHandlers(hookConfigPaths),
    agentCount: await countFiles(path.join(pluginDir, "agents")),
    settingsCount: await countFiles(path.join(pluginDir, "settings")),
  };
}

async function resolveCodexHookConfigPaths(input: {
  pluginDir: string;
  manifest: Record<string, unknown> | null;
}): Promise<string[]> {
  const explicit = hookManifestPaths(input.manifest?.hooks)
    .map((entry) => entry.startsWith("./") ? entry.slice(2) : entry)
    .filter((entry) => entry && !path.isAbsolute(entry) && !entry.split(/[\\/]+/).some((part) => part === ".."));
  const paths = explicit.length > 0
    ? explicit
    : ["hooks/hooks.json"];

  const resolved: string[] = [];
  for (const relativePath of paths) {
    const candidate = path.join(input.pluginDir, ...relativePath.split(/[\\/]+/));
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) resolved.push(candidate);
    } catch {
      // Missing hook config means no runtime hook handlers to verify.
    }
  }
  return resolved;
}

function hookManifestPaths(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

async function countCodexHookHandlers(configPaths: string[]): Promise<number> {
  let count = 0;
  for (const configPath of configPaths) {
    const parsed = await readJsonFile<Record<string, unknown>>(configPath);
    const hooks = asRecord(parsed?.hooks);
    for (const groups of Object.values(hooks)) {
      if (!Array.isArray(groups)) continue;
      for (const group of groups) {
        const handlers = asRecord(group).hooks;
        if (Array.isArray(handlers)) count += handlers.length;
      }
    }
  }
  return count;
}

function countProviderPluginHooks(response: Record<string, unknown>, pluginId: string): number {
  let count = 0;
  const data = Array.isArray(response.data) ? response.data : [];
  for (const item of data) {
    const hooks = Array.isArray(asRecord(item).hooks) ? asRecord(item).hooks as unknown[] : [];
    for (const hook of hooks) {
      const record = asRecord(hook);
      if (record.pluginId !== pluginId) continue;
      if (record.enabled === false) continue;
      count += 1;
    }
  }
  return count;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function countFiles(dirPath: string): Promise<number> {
  let count = 0;
  async function walk(absDir: string): Promise<void> {
    let dirents: import("node:fs").Dirent[];
    try {
      dirents = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const dirent of dirents) {
      const absPath = path.join(absDir, dirent.name);
      if (dirent.isDirectory()) await walk(absPath);
      else if (dirent.isFile()) count += 1;
    }
  }
  await walk(dirPath);
  return count;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function codexEnv(codexHome?: string): NodeJS.ProcessEnv {
  return codexHome ? { ...process.env, CODEX_HOME: codexHome } : { ...process.env };
}

function expandHome(inputPath: string, homeDir: string): string {
  if (inputPath === "~") return homeDir;
  if (inputPath.startsWith("~/")) return path.join(homeDir, inputPath.slice(2));
  return inputPath;
}
