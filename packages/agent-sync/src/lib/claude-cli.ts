import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { pathExists, readJsonFile, writeJsonFile } from "./fs-utils";

type KnownMarketplacesFile = Record<
  string,
  {
    installLocation?: string;
    source?: unknown;
    lastUpdated?: string;
    [key: string]: unknown;
  }
>;

export type ClaudeInstallAction =
  | { action: "planned"; home: string; plugin: string; marketplace?: string }
  | { action: "installed"; home: string; plugin: string; marketplace: string }
  | { action: "enabled"; home: string; plugin: string; marketplace: string }
  | { action: "skipped"; home: string; plugin: string; reason: string; marketplace?: string }
  | { action: "failed"; home: string; plugin: string; error: string; marketplace?: string };

export type ExecFn = (input: { cmd: string; args: string[]; cwd?: string }) => Promise<{
  code: number;
  stdout: string;
  stderr: string;
}>;

function homeDir(): string {
  // Prefer env var for deterministic overrides in tests.
  return process.env.HOME ? String(process.env.HOME) : os.homedir();
}

export function defaultClaudePluginsDir(): string {
  return path.join(homeDir(), ".claude", "plugins");
}

export const defaultExec: ExecFn = async ({ cmd, args, cwd }) => {
  const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => (stdout += String(d)));
  child.stderr.on("data", (d) => (stderr += String(d)));

  const code: number = await new Promise((resolve) => child.on("close", resolve));
  return { code, stdout, stderr };
};

async function readKnownMarketplaces(pluginsDir: string): Promise<KnownMarketplacesFile> {
  const file = path.join(pluginsDir, "known_marketplaces.json");
  return (await readJsonFile<KnownMarketplacesFile>(file)) ?? {};
}

function findMarketplaceNameForInstallLocation(mkts: KnownMarketplacesFile, installLocationAbs: string): string | null {
  const want = path.resolve(installLocationAbs);
  for (const [name, meta] of Object.entries(mkts)) {
    if (!meta || typeof meta !== "object") continue;
    const loc = (meta as any).installLocation;
    if (typeof loc !== "string") continue;
    if (path.resolve(loc) === want) return name;
  }
  return null;
}

export async function ensureClaudeMarketplace(input: {
  claudeLocalHome: string;
  claudePluginsDir?: string;
  dryRun: boolean;
  exec?: ExecFn;
}): Promise<{ marketplaceName: string }> {
  const pluginsDir = input.claudePluginsDir ?? defaultClaudePluginsDir();
  const exec = input.exec ?? defaultExec;

  const knownPath = path.join(pluginsDir, "known_marketplaces.json");
  const existing = await readKnownMarketplaces(pluginsDir);
  const found = findMarketplaceNameForInstallLocation(existing, input.claudeLocalHome);
  if (found) return { marketplaceName: found };

  if (input.dryRun) {
    // If the marketplace isn't known yet, we still need a placeholder name for the plan.
    // Use the directory basename to keep it stable/human-legible.
    return { marketplaceName: path.basename(path.resolve(input.claudeLocalHome)) };
  }

  const res = await exec({ cmd: "claude", args: ["plugin", "marketplace", "add", path.resolve(input.claudeLocalHome)] });
  if (res.code !== 0) {
    throw new Error(`claude plugin marketplace add failed (code=${res.code}): ${res.stderr || res.stdout}`);
  }

  const next = await readKnownMarketplaces(pluginsDir);
  const after = findMarketplaceNameForInstallLocation(next, input.claudeLocalHome);
  if (!after) {
    // Best-effort: if the CLI wrote known_marketplaces.json but we can't find the entry,
    // surface a clear error. This keeps behavior deterministic for callers.
    const debug = (await pathExists(knownPath)) ? await fs.readFile(knownPath, "utf8") : "(missing)";
    throw new Error(`Marketplace add succeeded but marketplace was not discoverable in known_marketplaces.json.\n${debug}`);
  }

  return { marketplaceName: after };
}

export async function installAndEnableClaudePlugin(input: {
  claudeLocalHome: string;
  pluginName: string;
  dryRun: boolean;
  enable: boolean;
  claudePluginsDir?: string;
  exec?: ExecFn;
}): Promise<ClaudeInstallAction[]> {
  const exec = input.exec ?? defaultExec;

  const isAlreadyInstalled = (text: string): boolean =>
    /already installed|is already installed/i.test(text);
  const isAlreadyEnabled = (text: string): boolean =>
    /already enabled|is already enabled|not found in disabled plugins/i.test(text);

  const { marketplaceName } = await ensureClaudeMarketplace({
    claudeLocalHome: input.claudeLocalHome,
    claudePluginsDir: input.claudePluginsDir,
    dryRun: input.dryRun,
    exec,
  });

  if (input.dryRun) {
    return [{ action: "planned", home: input.claudeLocalHome, plugin: input.pluginName, marketplace: marketplaceName }];
  }

  const pluginRef = `${input.pluginName}@${marketplaceName}`;

  const installRes = await exec({ cmd: "claude", args: ["plugin", "install", pluginRef] });
  const installText = `${installRes.stderr || ""}\n${installRes.stdout || ""}`.trim();
  if (installRes.code !== 0) {
    if (isAlreadyInstalled(installText)) {
      return [
        {
          action: "skipped",
          home: input.claudeLocalHome,
          plugin: input.pluginName,
          marketplace: marketplaceName,
          reason: "already installed",
        },
      ];
    }
    return [
      {
        action: "failed",
        home: input.claudeLocalHome,
        plugin: input.pluginName,
        marketplace: marketplaceName,
        error: installText,
      },
    ];
  }

  const actions: ClaudeInstallAction[] = [
    { action: "installed", home: input.claudeLocalHome, plugin: input.pluginName, marketplace: marketplaceName },
  ];

  if (input.enable) {
    const enableRes = await exec({ cmd: "claude", args: ["plugin", "enable", pluginRef] });
    const enableText = `${enableRes.stderr || ""}\n${enableRes.stdout || ""}`.trim();
    if (enableRes.code !== 0) {
      if (isAlreadyEnabled(enableText)) {
        actions.push({
          action: "skipped",
          home: input.claudeLocalHome,
          plugin: input.pluginName,
          marketplace: marketplaceName,
          reason: "already enabled",
        });
        return actions;
      }
      actions.push({
        action: "failed",
        home: input.claudeLocalHome,
        plugin: input.pluginName,
        marketplace: marketplaceName,
        error: enableText,
      });
      return actions;
    }
    actions.push({
      action: "enabled",
      home: input.claudeLocalHome,
      plugin: input.pluginName,
      marketplace: marketplaceName,
    });
  }

  return actions;
}

// Convenience helper for tests: allow writing a minimal known_marketplaces.json.
export async function writeKnownMarketplacesForTests(pluginsDir: string, data: KnownMarketplacesFile): Promise<void> {
  const file = path.join(pluginsDir, "known_marketplaces.json");
  await writeJsonFile(file, data);
}
