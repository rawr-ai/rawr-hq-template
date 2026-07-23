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
  "discover-command-ids.ts"
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

function discoverCommandIds(nodeEnv: "development" | "production"): string[] {
  const result = spawnSync("bun", [inventoryEntrypoint, cliRoot], {
    cwd: cliRoot,
    encoding: "utf8",
    env: childEnvironment(nodeEnv),
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe("");
  return JSON.parse(result.stdout) as string[];
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

  it("discovers the same commands from source and compiled output", () => {
    expect(existsSync(path.join(cliRoot, "oclif.manifest.json"))).toBe(false);

    const source = runCli("src/index.ts", ["--help"]);
    const built = runCli("bin/run.js", ["--help"]);
    const sourceCommandIds = discoverCommandIds("development");
    const builtCommandIds = discoverCommandIds("production");

    expect(source.status).toBe(0);
    expect(built.status).toBe(0);
    expect(source.stdout).toBe(built.stdout);
    expect(source.stderr).toBe("");
    expect(built.stderr).toBe("");
    expect(sourceCommandIds).toEqual(builtCommandIds);
    expect(sourceCommandIds).toContain("agent:plugins:status");
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
});
