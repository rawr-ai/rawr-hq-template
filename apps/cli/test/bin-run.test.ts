import { spawnSync } from "node:child_process";
import { lstatSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = realpathSync(os.tmpdir());
const stateRootPrefix = "rawr-oclif-entry-";
const isolatedStateRoot = realpathSync(mkdtempSync(path.join(temporaryRoot, stateRootPrefix)));
const inventoryEntrypoint = path.join(
  cliRoot,
  "test",
  "command-fixture",
  "discover-command-inventory.ts"
);
const pluginInventoryEntrypoint = path.join(
  cliRoot,
  "test",
  "command-fixture",
  "discover-plugin-command-ids.ts"
);
const firstPartyCommandPluginRoots = [
  "chatgpt-corpus",
  "devops",
  "hyperresearch",
  "session-tools",
].map((name) => path.resolve(cliRoot, "..", "..", "plugins", "cli", "commands", name));
const commandPluginRoots = [cliRoot, ...firstPartyCommandPluginRoots];
const releaseManifestRoots = [cliRoot, ...firstPartyCommandPluginRoots];

afterAll(() => {
  const canonicalRoot = realpathSync(isolatedStateRoot);
  const status = lstatSync(canonicalRoot);
  if (
    !status.isDirectory() ||
    status.isSymbolicLink() ||
    canonicalRoot !== isolatedStateRoot ||
    path.dirname(canonicalRoot) !== temporaryRoot ||
    !path.basename(canonicalRoot).startsWith(stateRootPrefix)
  ) {
    throw new Error(`refusing to remove invalid Oclif test root: ${isolatedStateRoot}`);
  }
  rmSync(canonicalRoot, { recursive: true, force: true });
});

function childEnvironment(nodeEnv?: "development" | "production"): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of [
    "LANG",
    "LC_ALL",
    "PATH",
    "PATHEXT",
    "SystemRoot",
    "TEMP",
    "TMP",
    "TMPDIR",
    "WINDIR",
  ]) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return {
    ...env,
    HOME: isolatedStateRoot,
    ...(nodeEnv === undefined ? {} : { NODE_ENV: nodeEnv }),
    NO_COLOR: "1",
    XDG_CACHE_HOME: path.join(isolatedStateRoot, "xdg-cache"),
    XDG_CONFIG_HOME: path.join(isolatedStateRoot, "xdg-config"),
    XDG_DATA_HOME: path.join(isolatedStateRoot, "xdg-data"),
  };
}

function runCli(entrypoint: "bin/run.js" | "src/index.ts", args: string[]) {
  return spawnSync("bun", [entrypoint, ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env: childEnvironment(),
  });
}

type CommandInventoryEntry = Readonly<{ id: string; pluginName: string | null }>;

function discoverCommandInventory(nodeEnv: "development" | "production"): CommandInventoryEntry[] {
  const result = spawnSync("bun", [inventoryEntrypoint, cliRoot], {
    cwd: cliRoot,
    encoding: "utf8",
    env: childEnvironment(nodeEnv),
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe("");
  return JSON.parse(result.stdout) as CommandInventoryEntry[];
}

function discoverPluginCommands(
  root: string,
  nodeEnv: "development" | "production",
  mode: "live" | "manifest" = "live"
): { commandIds: string[]; hasManifest: boolean; relativePaths: string[][] } {
  const result = spawnSync("bun", [pluginInventoryEntrypoint, root, mode], {
    cwd: cliRoot,
    encoding: "utf8",
    env: childEnvironment(nodeEnv),
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe("");
  return JSON.parse(result.stdout) as {
    commandIds: string[];
    hasManifest: boolean;
    relativePaths: string[][];
  };
}

describe("bin/run.js", () => {
  it("runs the built CLI through the ordinary Oclif entrypoint", () => {
    const result = runCli("bin/run.js", ["--version"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("@habitat-ai/rawr");
    expect(result.stderr).toBe("");
  });

  it("loads the same manifest-backed application inventory from source and compiled entrypoints", () => {
    const source = runCli("src/index.ts", ["--help"]);
    const built = runCli("bin/run.js", ["--help"]);
    const sourceInventory = discoverCommandInventory("development");
    const builtInventory = discoverCommandInventory("production");
    const sourceCommandIds = sourceInventory.map(({ id }) => id);

    expect(source.status).toBe(0);
    expect(built.status).toBe(0);
    expect(source.stdout).toBe(built.stdout);
    expect(source.stderr).toBe("");
    expect(built.stderr).toBe("");
    expect(sourceInventory).toEqual(builtInventory);
    expect(sourceCommandIds).toContain("agent:plugins:status");
    expect(sourceCommandIds).toContain("agent:plugins:status:vendors");
    expect(sourceCommandIds).toContain("agent:plugins:update:vendors");
    expect(sourceCommandIds).not.toContain("agent:plugins:vendors:status");
    expect(sourceCommandIds).not.toContain("agent:plugins:vendors:update");
    expect(sourceCommandIds).not.toContain("plugins:list");
    for (const id of NATIVE_EXTERNAL_PLUGIN_COMMANDS) {
      expect(sourceCommandIds).not.toContain(id);
    }
    for (const id of RETIRED_COMMANDS) {
      expect(sourceCommandIds).not.toContain(id);
    }
  });

  it("discovers the CLI and every command plugin from source and compiled output without manifests", () => {
    for (const pluginRoot of commandPluginRoots) {
      const source = discoverPluginCommands(pluginRoot, "development");
      const built = discoverPluginCommands(pluginRoot, "production");

      expect(source.hasManifest).toBe(false);
      expect(built.hasManifest).toBe(false);
      expect(source.commandIds).toEqual(built.commandIds);
      expect(source.relativePaths.every(([root]) => root === "src")).toBe(true);
      expect(built.relativePaths.every(([root]) => root === "dist")).toBe(true);
    }
  });

  it("uses generated manifests for the same compiled command inventory", () => {
    for (const releaseRoot of releaseManifestRoots) {
      const built = discoverPluginCommands(releaseRoot, "production");
      const manifest = discoverPluginCommands(releaseRoot, "production", "manifest");

      expect(manifest.hasManifest).toBe(true);
      expect(manifest.commandIds).toEqual(built.commandIds);
      expect(manifest.relativePaths).toEqual(built.relativePaths);
      expect(manifest.relativePaths.every(([root]) => root === "dist")).toBe(true);
    }
  });

  it("delegates unknown-command failure to Oclif", () => {
    const result = runCli("bin/run.js", ["not-a-command"]);

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("command not-a-command not found");
  });
});

const NATIVE_EXTERNAL_PLUGIN_COMMANDS = [
  "plugins",
  "plugins:inspect",
  "plugins:install",
  "plugins:link",
  "plugins:reset",
  "plugins:uninstall",
  "plugins:update",
] as const;

const RETIRED_COMMANDS = [
  "doctor:global",
  "hyperresearch:codex-slice",
  "hyperresearch:codex:run-fixture",
  "agent:sync",
  "agent:plugins:attest-promotion",
  "agent:plugins:export",
  "agent:plugins:retire",
  "agent:plugins:undo",
  "agent:plugins:vendors:status",
  "agent:plugins:vendors:update",
  "undo",
  "plugins:list",
  "plugins:sync",
  "plugins:status",
  "plugins:export",
  "plugins:scaffold",
  "plugins:web",
  "app",
] as const;
