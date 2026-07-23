import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
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
const commandPluginRoots = [
  "chatgpt-corpus",
  "devops",
  "hello",
  "hyperresearch",
  "session-tools",
].map((name) => path.resolve(cliRoot, "..", "..", "plugins", "cli", "commands", name));

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
  nodeEnv: "development" | "production"
): { commandIds: string[]; hasManifest: boolean; relativePaths: string[][] } {
  const result = spawnSync("bun", [pluginInventoryEntrypoint, root], {
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
    expect(result.stdout).toContain("@rawr/cli");
    expect(result.stderr).toBe("");
  });

  it("re-enters source and built Oclif entrypoints directly", () => {
    for (const entrypoint of ["src/index.ts", "bin/run.js"] as const) {
      const result = runCli(entrypoint, ["routine", "check", "--json", "--dry-run"]);

      expect(result.status, result.stderr).toBe(0);
      const output = JSON.parse(result.stdout) as {
        ok: boolean;
        data: { steps: readonly { cmd: string; args: readonly string[]; cwd: string }[] };
      };
      expect(output.ok).toBe(true);
      expect(output.data.steps[0]).toMatchObject({
        cmd: process.execPath,
        args: [path.join(cliRoot, entrypoint), "doctor", "--json"],
        cwd: cliRoot,
      });
    }
  });

  it("discovers the same commands from source and compiled output", () => {
    expect(existsSync(path.join(cliRoot, "oclif.manifest.json"))).toBe(false);

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
    expect(sourceCommandIds).toContain("plugins");
    expect(sourceCommandIds).toContain("plugins:install");
    expect(sourceCommandIds).not.toContain("plugins:list");
    for (const id of REQUIRED_EXTERNAL_PLUGIN_COMMANDS) {
      expect(sourceCommandIds).toContain(id);
    }
    for (const id of RETIRED_COMMANDS) {
      expect(sourceCommandIds).not.toContain(id);
    }
    const external = sourceInventory.filter(
      ({ id }) => id === "plugins" || id.startsWith("plugins:")
    );
    expect(external.length).toBeGreaterThan(0);
    expect(external.every(({ pluginName }) => pluginName === "@oclif/plugin-plugins")).toBe(true);
  });

  it("discovers every command plugin from source and compiled output without a manifest", () => {
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

  it("rejects the retired global installation diagnostic", () => {
    const result = runCli("bin/run.js", ["doctor", "global", "--help"]);

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Command doctor:global not found");
  });
});

const REQUIRED_EXTERNAL_PLUGIN_COMMANDS = [
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
