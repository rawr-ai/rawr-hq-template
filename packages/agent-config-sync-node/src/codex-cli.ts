import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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
      mcpServerCount: number;
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
  skillsList(params: { cwds: string[]; forceReload: boolean }): Promise<Record<string, unknown>>;
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
    });
    try {
      await appServer.initialize();
      await appServer.pluginList({ cwds: [input.marketplaceRoot] });

      for (const plugin of uniquePlugins) {
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
          mcpServerCount: pluginDetailArrayLength(detail, "mcpServers"),
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
}): Promise<CodexAppServerSession> {
  const child = spawn(input.codexBin, ["app-server", "--listen", "stdio://", "--enable", "plugins"], {
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

  skillsList(params: { cwds: string[]; forceReload: boolean }): Promise<Record<string, unknown>> {
    return this.request("skills/list", {
      cwds: params.cwds,
      forceReload: params.forceReload,
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

function skillsListSkillCount(response: Record<string, unknown>): number {
  const data = Array.isArray(response.data) ? response.data : [];
  return data.reduce((sum, item) => {
    const record = asRecord(item);
    const skills = Array.isArray(record.skills) ? record.skills : [];
    return sum + skills.length;
  }, 0);
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
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
