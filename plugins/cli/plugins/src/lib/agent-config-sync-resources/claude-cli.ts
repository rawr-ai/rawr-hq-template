import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { pathExists, readJsonFile, writeJsonFile } from "./fs-utils";

type KnownMarketplaceRecord = {
  installLocation?: string;
  source?: unknown;
  lastUpdated?: string;
  [key: string]: unknown;
};

type KnownMarketplacesFile = Record<string, KnownMarketplaceRecord>;

/**
 * Projection result for local Claude plugin installation and enablement.
 */
export type ClaudeInstallAction =
  | { action: "planned"; home: string; plugin: string; marketplace?: string }
  | { action: "installed"; home: string; plugin: string; marketplace: string }
  | { action: "enabled"; home: string; plugin: string; marketplace: string }
  | { action: "skipped"; home: string; plugin: string; reason: string; marketplace?: string }
  | { action: "failed"; home: string; plugin: string; error: string; marketplace?: string };

/**
 * Injectable process runner used by tests and local Claude CLI orchestration.
 */
export type ExecFn = (input: {
  cmd: string;
  args: string[];
  cwd?: string;
}) => Promise<{
  code: number;
  stdout: string;
  stderr: string;
}>;

/**
 * Finds the user's home directory for Claude marketplace defaults.
 */
function homeDir(): string {
  return process.env.HOME ? String(process.env.HOME) : os.homedir();
}

/**
 * Mirrors Claude Code's default plugin registry directory.
 */
export function defaultClaudePluginsDir(): string {
  return path.join(homeDir(), ".claude", "plugins");
}

/**
 * Executes Claude CLI commands for projection-owned install/enable operations.
 */
export const defaultExec: ExecFn = async ({ cmd, args, cwd }) => {
  const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
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

/**
 * Reads Claude's known marketplace registry.
 */
async function readKnownMarketplaces(pluginsDir: string): Promise<KnownMarketplacesFile> {
  const filePath = path.join(pluginsDir, "known_marketplaces.json");
  return (await readJsonFile<KnownMarketplacesFile>(filePath)) ?? {};
}

/**
 * Resolves a marketplace name from Claude's registry by install location.
 */
function findMarketplaceNameForInstallLocation(
  marketplaces: KnownMarketplacesFile,
  installLocationAbs: string,
): string | null {
  const wantedLocation = path.resolve(installLocationAbs);
  for (const [name, metadata] of Object.entries(marketplaces)) {
    if (typeof metadata.installLocation !== "string") continue;
    if (path.resolve(metadata.installLocation) === wantedLocation) return name;
  }
  return null;
}

/**
 * Ensures the local Claude plugin home is registered as a marketplace.
 */
export async function ensureClaudeMarketplace(input: {
  claudeLocalHome: string;
  claudePluginsDir?: string;
  dryRun: boolean;
  exec?: ExecFn;
}): Promise<{ marketplaceName: string }> {
  const pluginsDir = input.claudePluginsDir ?? defaultClaudePluginsDir();
  const exec = input.exec ?? defaultExec;

  const knownMarketplacesPath = path.join(pluginsDir, "known_marketplaces.json");
  const existingMarketplaces = await readKnownMarketplaces(pluginsDir);
  const existingName = findMarketplaceNameForInstallLocation(
    existingMarketplaces,
    input.claudeLocalHome,
  );
  if (existingName) return { marketplaceName: existingName };

  if (input.dryRun) {
    return { marketplaceName: path.basename(path.resolve(input.claudeLocalHome)) };
  }

  const result = await exec({
    cmd: "claude",
    args: ["plugin", "marketplace", "add", path.resolve(input.claudeLocalHome)],
  });
  if (result.code !== 0) {
    throw new Error(
      `claude plugin marketplace add failed (code=${result.code}): ${result.stderr || result.stdout}`,
    );
  }

  const nextMarketplaces = await readKnownMarketplaces(pluginsDir);
  const marketplaceName = findMarketplaceNameForInstallLocation(
    nextMarketplaces,
    input.claudeLocalHome,
  );
  if (marketplaceName) return { marketplaceName };

  const debugSnapshot = (await pathExists(knownMarketplacesPath))
    ? await fs.readFile(knownMarketplacesPath, "utf8")
    : "(missing)";
  throw new Error(
    "Marketplace add succeeded but marketplace was not discoverable in known_marketplaces.json.\n" +
      debugSnapshot,
  );
}

/**
 * Installs and optionally enables a synced plugin through Claude's CLI.
 */
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
    return [
      {
        action: "planned",
        home: input.claudeLocalHome,
        plugin: input.pluginName,
        marketplace: marketplaceName,
      },
    ];
  }

  const pluginRef = `${input.pluginName}@${marketplaceName}`;
  const installResult = await exec({
    cmd: "claude",
    args: ["plugin", "install", pluginRef],
  });
  const installText = `${installResult.stderr || ""}\n${installResult.stdout || ""}`.trim();
  if (installResult.code !== 0) {
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
    {
      action: "installed",
      home: input.claudeLocalHome,
      plugin: input.pluginName,
      marketplace: marketplaceName,
    },
  ];

  if (!input.enable) return actions;

  const enableResult = await exec({
    cmd: "claude",
    args: ["plugin", "enable", pluginRef],
  });
  const enableText = `${enableResult.stderr || ""}\n${enableResult.stdout || ""}`.trim();
  if (enableResult.code !== 0) {
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
  return actions;
}

/**
 * Test helper for exercising Claude marketplace detection without shelling out.
 */
export async function writeKnownMarketplacesForTests(
  pluginsDir: string,
  data: KnownMarketplacesFile,
): Promise<void> {
  const filePath = path.join(pluginsDir, "known_marketplaces.json");
  await writeJsonFile(filePath, data);
}
