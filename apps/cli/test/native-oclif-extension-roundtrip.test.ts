import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const cliRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(cliRoot, "../..");
const temporaryParent = realpathSync("/tmp");
const stateRootPrefix = "rawr-native-oclif-";
const fixtureRoot = path.join(workspaceRoot, "plugins", "cli", "commands", "hello");
const fixturePackage = path.join(fixtureRoot, "package.json");
const nodeExecutable = resolveNodeExecutable();

type AcceptanceState = Readonly<{
  claudeHome: string;
  codexHome: string;
  home: string;
  npmCache: string;
  npmConfig: string;
  npmGlobalConfig: string;
  npmPrefix: string;
  root: string;
  xdgCache: string;
  xdgConfig: string;
  xdgData: string;
}>;

let acceptanceState: AcceptanceState | undefined;

afterAll(() => {
  if (acceptanceState === undefined) return;
  const { root } = acceptanceState;
  acceptanceState = undefined;
  removeAcceptanceRoot(root);
});

beforeAll(() => {
  const root = realpathSync(mkdtempSync(path.join(temporaryParent, stateRootPrefix)));
  const state: AcceptanceState = {
    claudeHome: path.join(root, "claude-home"),
    codexHome: path.join(root, "codex-home"),
    home: path.join(root, "home"),
    npmCache: path.join(root, "npm-cache"),
    npmConfig: path.join(root, "npmrc"),
    npmGlobalConfig: path.join(root, "npm-globalrc"),
    npmPrefix: path.join(root, "npm-prefix"),
    root,
    xdgCache: path.join(root, "xdg-cache"),
    xdgConfig: path.join(root, "xdg-config"),
    xdgData: path.join(root, "xdg-data"),
  };
  acceptanceState = state;

  try {
    for (const directory of [
      state.home,
      state.xdgData,
      state.xdgConfig,
      state.xdgCache,
      state.npmCache,
      state.npmPrefix,
      state.codexHome,
      state.claudeHome,
    ]) {
      mkdirSync(directory, { recursive: true });
    }
    writeFileSync(state.npmConfig, "fund=false\naudit=false\n");
    writeFileSync(state.npmGlobalConfig, "");
    writeFileSync(path.join(state.codexHome, "sentinel"), "codex\n");
    writeFileSync(path.join(state.claudeHome, "sentinel"), "claude\n");
  } catch (error) {
    acceptanceState = undefined;
    removeAcceptanceRoot(root);
    throw error;
  }
});

describe("native Oclif extension lifecycle", () => {
  it("installs, lists, invokes, and removes a local extension through @oclif/plugin-plugins", {
    timeout: 120_000,
  }, () => {
    const fixturePackageBefore = readFileSync(fixturePackage);
    expectNodePrerequisite();
    expect(listPlugins().some(({ name }) => name === "@rawr/plugin-hello")).toBe(false);

    const install = runRawr(["plugins", "install", pathToFileURL(fixtureRoot).href, "--silent"]);
    expect(install.status, install.stderr).toBe(0);

    const installed = listPlugins();
    const hello = installed.find(({ name }) => name === "@rawr/plugin-hello");
    expect(hello).toMatchObject({
      commandIDs: ["hello"],
      name: "@rawr/plugin-hello",
      type: "user",
      version: "0.1.0",
    });
    expect(isWithin(requireAcceptanceState().xdgData, hello?.root ?? "")).toBe(true);

    const invoke = runRawr(["hello"]);
    expect(invoke.status, invoke.stderr).toBe(0);
    expect(invoke.stdout).toBe("hello\n");
    expect(invoke.stderr).toBe("");

    const remove = runRawr(["plugins", "uninstall", "@rawr/plugin-hello"]);
    expect(remove.status, remove.stderr).toBe(0);

    expect(listPlugins().some(({ name }) => name === "@rawr/plugin-hello")).toBe(false);
    const invokeAfterRemoval = runRawr(["hello"]);
    expect(invokeAfterRemoval.status).toBe(2);
    expect(invokeAfterRemoval.stderr).toContain("command hello not found");

    expect(readFileSync(fixturePackage)).toEqual(fixturePackageBefore);
    expect(providerState()).toEqual({
      claude: { entries: ["sentinel"], sentinel: "claude\n" },
      codex: { entries: ["sentinel"], sentinel: "codex\n" },
    });
  });
});

type PluginEntry = Readonly<{
  commandIDs?: readonly string[];
  name?: string;
  root?: string;
  type?: string;
  version?: string;
}>;

function runRawr(args: readonly string[]) {
  return spawnSync("bun", [path.join(cliRoot, "bin", "run.js"), ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: childEnvironment(),
    maxBuffer: 1024 * 1024,
  });
}

function listPlugins(): readonly PluginEntry[] {
  const result = runRawr(["plugins", "--json"]);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe("");
  return JSON.parse(result.stdout) as PluginEntry[];
}

function childEnvironment(): NodeJS.ProcessEnv {
  const state = requireAcceptanceState();
  const inherited: NodeJS.ProcessEnv = {};
  for (const name of ["LANG", "LC_ALL", "PATH", "PATHEXT", "SystemRoot", "WINDIR"]) {
    if (process.env[name] !== undefined) inherited[name] = process.env[name];
  }
  return {
    ...inherited,
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    CLAUDE_CONFIG_DIR: state.claudeHome,
    CODEX_HOME: state.codexHome,
    HOME: state.home,
    NODE_ENV: "production",
    NO_COLOR: "1",
    NPM_CONFIG_CACHE: state.npmCache,
    NPM_CONFIG_GLOBALCONFIG: state.npmGlobalConfig,
    NPM_CONFIG_PREFIX: state.npmPrefix,
    NPM_CONFIG_REGISTRY: "https://registry.npmjs.org",
    NPM_CONFIG_USERCONFIG: state.npmConfig,
    RAWR_NPM_REGISTRY: "https://registry.npmjs.org",
    TEMP: state.root,
    TMP: state.root,
    TMPDIR: state.root,
    XDG_CACHE_HOME: state.xdgCache,
    XDG_CONFIG_HOME: state.xdgConfig,
    XDG_DATA_HOME: state.xdgData,
    PATH: [path.dirname(nodeExecutable), inherited.PATH].filter(Boolean).join(path.delimiter),
  };
}

function expectNodePrerequisite(): void {
  const result = spawnSync(nodeExecutable, ["--version"], {
    encoding: "utf8",
    env: childEnvironment(),
  });
  expect(result.status, result.stderr).toBe(0);
  const match = /^v(?<major>\d+)\.(?<minor>\d+)\./u.exec(result.stdout.trim());
  expect(match?.groups).toBeDefined();
  const major = Number(match?.groups?.major);
  const minor = Number(match?.groups?.minor);
  expect((major === 20 && minor >= 17) || (major === 22 && minor >= 9) || major > 22).toBe(true);
}

function resolveNodeExecutable(): string {
  const result = spawnSync("node", ["--print", "process.execPath"], {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`unable to resolve the ambient Node executable: ${result.stderr}`);
  }
  const executable = result.stdout.trim();
  if (!path.isAbsolute(executable) || !existsSync(executable)) {
    throw new Error(`ambient Node reported an invalid executable path: ${executable}`);
  }
  return realpathSync(executable);
}

function providerState() {
  const { claudeHome, codexHome } = requireAcceptanceState();
  return {
    claude: {
      entries: readdirSync(claudeHome).sort(),
      sentinel: readFileSync(path.join(claudeHome, "sentinel"), "utf8"),
    },
    codex: {
      entries: readdirSync(codexHome).sort(),
      sentinel: readFileSync(path.join(codexHome, "sentinel"), "utf8"),
    },
  };
}

function requireAcceptanceState(): AcceptanceState {
  if (acceptanceState === undefined) {
    throw new Error("native Oclif acceptance state is not initialized");
  }
  return acceptanceState;
}

function removeAcceptanceRoot(root: string): void {
  if (!existsSync(root)) return;
  const canonicalRoot = realpathSync(root);
  const status = lstatSync(canonicalRoot);
  if (
    !status.isDirectory() ||
    status.isSymbolicLink() ||
    canonicalRoot !== root ||
    path.dirname(canonicalRoot) !== temporaryParent ||
    !path.basename(canonicalRoot).startsWith(stateRootPrefix)
  ) {
    throw new Error(`refusing to remove invalid Oclif acceptance root: ${root}`);
  }
  rmSync(canonicalRoot, { recursive: true, force: false });
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
