import { execFileSync, spawn } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

type CommandResult = Readonly<{
  exitCode: number;
  stderr: string;
  stdout: string;
}>;

type PluginEntry = Readonly<{
  commandIDs?: readonly string[];
  name?: string;
  root?: string;
  type?: string;
  version?: string;
}>;

const FIXTURE_PREFIX = "habitat-native-oclif-";
const PUBLIC_NPM_REGISTRY = "https://registry.npmjs.org";
const cliRoot = fileURLToPath(new URL("..", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url));
const sdkRoot = path.join(workspaceRoot, "packages/core/sdk");
const extensionRoot = path.join(cliRoot, "test/fixtures/native-oclif-extension");
const temporaryParent = await realpath(tmpdir());
const gitLocalEnvironmentVariables = execFileSync("git", ["rev-parse", "--local-env-vars"], {
  cwd: workspaceRoot,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter((name) => name.length > 0);
const canonicalCommandIds = [
  "plugins",
  "plugins:inspect",
  "plugins:install",
  "plugins:link",
  "plugins:reset",
  "plugins:uninstall",
  "plugins:update",
] as const;
const nativeAliases = {
  "plugins:install": ["plugins:add"],
  "plugins:uninstall": ["plugins:unlink", "plugins:remove"],
} as const;
const extensionName = "@fixture/native-oclif-extension";
const extensionCommand = "native-fixture";

let acceptanceRoot = "";
let consumerRoot = "";
let extensionTarball = "";
let habitatExecutable = "";
let linkedExtensionRoot = "";

beforeAll(async () => {
  acceptanceRoot = await realpath(await mkdtemp(path.join(temporaryParent, FIXTURE_PREFIX)));
  consumerRoot = path.join(acceptanceRoot, "consumer");
  const linkConsumerRoot = path.join(acceptanceRoot, "link-consumer");
  await Promise.all(
    [
      "packages",
      "runtime/cache",
      "runtime/claude-home",
      "runtime/codex-home",
      "runtime/config",
      "runtime/data",
      "runtime/home",
      "runtime/npm-prefix",
      "runtime/tmp",
      "consumer",
      "link-consumer",
    ].map((directory) => mkdir(path.join(acceptanceRoot, directory), { recursive: true }))
  );
  await writeFile(path.join(acceptanceRoot, "runtime/config/npmrc"), "audit=false\nfund=false\n");
  await writeFile(path.join(acceptanceRoot, "runtime/config/npm-globalrc"), "");
  await writeFile(path.join(acceptanceRoot, "runtime/codex-home/sentinel"), "codex\n");
  await writeFile(path.join(acceptanceRoot, "runtime/claude-home/sentinel"), "claude\n");

  const cliVersion = await packageVersion(path.join(cliRoot, "package.json"));
  const sdkVersion = await packageVersion(path.join(sdkRoot, "package.json"));
  expect(cliVersion).toBe(sdkVersion);

  const cliTarball = await packPackage(cliRoot, `habitat-ai-cli-${cliVersion}.tgz`);
  const sdkTarball = await packPackage(sdkRoot, `habitat-ai-sdk-${sdkVersion}.tgz`);
  extensionTarball = await packPackage(extensionRoot, "fixture-native-oclif-extension-1.0.0.tgz");
  await writeFile(
    path.join(linkConsumerRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "@fixture/native-oclif-link-consumer",
        private: true,
        packageManager: "bun@1.3.14",
        dependencies: {
          [extensionName]: `file:${path.relative(linkConsumerRoot, extensionTarball)}`,
        },
      },
      null,
      2
    )}\n`
  );
  const linkInstalled = await run("bun", ["install", "--ignore-scripts"], {
    cwd: linkConsumerRoot,
    timeoutMs: 180_000,
  });
  expect(linkInstalled, linkInstalled.stderr || linkInstalled.stdout).toMatchObject({
    exitCode: 0,
  });
  linkedExtensionRoot = await realpath(
    path.join(linkConsumerRoot, "node_modules/@fixture/native-oclif-extension")
  );
  expect(isWithin(linkConsumerRoot, linkedExtensionRoot)).toBe(true);
  expect(linkedExtensionRoot).not.toBe(await realpath(extensionRoot));
  const linkedRequire = createRequire(path.join(linkedExtensionRoot, "package.json"));
  const linkedOclifCore = await realpath(linkedRequire.resolve("@oclif/core"));
  expect(isWithin(linkConsumerRoot, linkedOclifCore)).toBe(true);
  expect(isWithin(workspaceRoot, linkedOclifCore)).toBe(false);

  await writeFile(
    path.join(consumerRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "@fixture/habitat-native-oclif-consumer",
        private: true,
        packageManager: "bun@1.3.14",
        dependencies: {
          "@habitat-ai/cli": `file:${path.relative(consumerRoot, cliTarball)}`,
          "@habitat-ai/sdk": `file:${path.relative(consumerRoot, sdkTarball)}`,
        },
      },
      null,
      2
    )}\n`
  );

  const installed = await run("bun", ["install", "--ignore-scripts"], {
    cwd: consumerRoot,
    timeoutMs: 180_000,
  });
  expect(installed, installed.stderr || installed.stdout).toMatchObject({ exitCode: 0 });
  habitatExecutable = path.join(consumerRoot, "node_modules/.bin/habitat");
}, 180_000);

afterAll(async () => {
  if (acceptanceRoot === "") return;
  const root = acceptanceRoot;
  acceptanceRoot = "";
  consumerRoot = "";
  extensionTarball = "";
  habitatExecutable = "";
  linkedExtensionRoot = "";
  await removeOwnedFixture(root);
});

describe("installed Habitat native Oclif extension lifecycle", () => {
  it("discovers the exact vendor-owned command and alias inventory", async () => {
    const installedCliRoot = await realpath(
      path.join(consumerRoot, "node_modules/@habitat-ai/cli")
    );
    const installedSdkRoot = await realpath(
      path.join(consumerRoot, "node_modules/@habitat-ai/sdk")
    );
    expect(isWithin(path.join(consumerRoot, "node_modules"), installedCliRoot)).toBe(true);
    expect(isWithin(path.join(consumerRoot, "node_modules"), installedSdkRoot)).toBe(true);
    expect(installedCliRoot).not.toBe(await realpath(cliRoot));
    expect(installedSdkRoot).not.toBe(await realpath(sdkRoot));
    expect((await readdir(path.join(consumerRoot, "node_modules/@habitat-ai"))).sort()).toEqual([
      "cli",
      "sdk",
    ]);

    const cliPackage = JSON.parse(
      await readFile(path.join(installedCliRoot, "package.json"), "utf8")
    ) as {
      dependencies?: Readonly<Record<string, string>>;
      oclif?: { plugins?: readonly string[] };
    };
    expect(cliPackage.dependencies?.["@oclif/plugin-plugins"]).toBe("^5.4.84");
    expect(cliPackage.oclif?.plugins).toEqual(["@oclif/plugin-help", "@oclif/plugin-plugins"]);

    const cliRequire = createRequire(path.join(installedCliRoot, "package.json"));
    const pluginEntrypoint = cliRequire.resolve("@oclif/plugin-plugins");
    const pluginRoot = await realpath(path.dirname(path.dirname(pluginEntrypoint)));
    expect(isWithin(path.join(consumerRoot, "node_modules"), pluginRoot)).toBe(true);
    const pluginManifest = JSON.parse(
      await readFile(path.join(pluginRoot, "oclif.manifest.json"), "utf8")
    ) as {
      commands: Readonly<Record<string, { aliases?: readonly string[]; pluginName?: string }>>;
    };
    expect(Object.keys(pluginManifest.commands).sort()).toEqual([...canonicalCommandIds].sort());
    expect(pluginManifest.commands["plugins:install"]?.aliases).toEqual(
      nativeAliases["plugins:install"]
    );
    expect(pluginManifest.commands["plugins:uninstall"]?.aliases).toEqual(
      nativeAliases["plugins:uninstall"]
    );
    for (const id of canonicalCommandIds) {
      expect(pluginManifest.commands[id]?.pluginName).toBe("@oclif/plugin-plugins");
      const help = await runHabitat([...id.split(":"), "--help"]);
      expect(help, `${id}\n${help.stderr || help.stdout}`).toMatchObject({ exitCode: 0 });
    }
    for (const alias of Object.values(nativeAliases).flat()) {
      const help = await runHabitat([...alias.split(":"), "--help"]);
      expect(help, `${alias}\n${help.stderr || help.stdout}`).toMatchObject({ exitCode: 0 });
    }
    const inventedList = await runHabitat(["plugins", "list", "--help"]);
    expect(inventedList.exitCode).toBe(2);
    expect(await listPlugins()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "@oclif/plugin-plugins", type: "core" }),
      ])
    );
  });

  it("roundtrips install, inspect, update, uninstall, link, and reset in native state", async () => {
    expect(await listManagedPlugins()).toEqual([]);

    const installed = await runHabitat([
      "plugins",
      "install",
      pathToFileURL(extensionTarball).href,
      "--silent",
    ]);
    expect(installed, installed.stderr || installed.stdout).toMatchObject({ exitCode: 0 });
    await expectExtension({ type: "user" });
    await expectExtensionInvocation();

    const updated = await runHabitat(["plugins", "update"]);
    expect(updated, updated.stderr || updated.stdout).toMatchObject({ exitCode: 0 });
    await expectExtension({ type: "user" });
    await expectExtensionInvocation();

    const uninstalled = await runHabitat(["plugins", "uninstall", extensionName]);
    expect(uninstalled, uninstalled.stderr || uninstalled.stdout).toMatchObject({ exitCode: 0 });
    await expectExtensionAbsent();

    const linked = await runHabitat(["plugins", "link", linkedExtensionRoot, "--no-install"]);
    expect(linked, linked.stderr || linked.stdout).toMatchObject({ exitCode: 0 });
    await expectExtension({ root: linkedExtensionRoot, type: "link" });
    await expectExtensionInvocation();

    const reset = await runHabitat(["plugins", "reset"]);
    expect(reset, reset.stderr || reset.stdout).toMatchObject({ exitCode: 0 });
    await expectExtensionAbsent();
    expect(await providerState()).toEqual({ claude: "claude\n", codex: "codex\n" });
  });
});

async function expectExtension(input: { readonly root?: string; readonly type: "link" | "user" }) {
  const plugins = await listManagedPlugins();
  const extension = plugins.find(({ name }) => name === extensionName);
  expect(extension).toMatchObject({
    commandIDs: [extensionCommand],
    name: extensionName,
    type: input.type,
    version: "1.0.0",
    ...(input.root === undefined ? {} : { root: input.root }),
  });
  if (input.type === "user") {
    expect(isWithin(path.join(acceptanceRoot, "runtime/data"), extension?.root ?? "")).toBe(true);
  }

  const inspected = await runHabitat(["plugins", "inspect", extensionName, "--json"]);
  expect(inspected, inspected.stderr || inspected.stdout).toMatchObject({
    exitCode: 0,
    stderr: "",
  });
  const inspection = JSON.parse(inspected.stdout) as readonly PluginEntry[];
  expect(inspection).toEqual([
    expect.objectContaining({
      commandIDs: [extensionCommand],
      name: extensionName,
      type: input.type,
      version: "1.0.0",
    }),
  ]);
}

async function expectExtensionInvocation(): Promise<void> {
  const invoked = await runHabitat([extensionCommand]);
  expect(invoked, invoked.stderr || invoked.stdout).toEqual({
    exitCode: 0,
    stderr: "",
    stdout: "native fixture 1.0.0\n",
  });
}

async function expectExtensionAbsent(): Promise<void> {
  expect((await listManagedPlugins()).some(({ name }) => name === extensionName)).toBe(false);
  const invoked = await runHabitat([extensionCommand]);
  expect(invoked.exitCode).toBe(2);
  expect(invoked.stderr).toContain(`command ${extensionCommand} not found`);
}

async function listPlugins(): Promise<readonly PluginEntry[]> {
  const result = await runHabitat(["plugins", "--json"]);
  expect(result, result.stderr || result.stdout).toMatchObject({ exitCode: 0, stderr: "" });
  return JSON.parse(result.stdout) as readonly PluginEntry[];
}

async function listManagedPlugins(): Promise<readonly PluginEntry[]> {
  return (await listPlugins()).filter(({ type }) => type === "link" || type === "user");
}

async function packPackage(root: string, filename: string): Promise<string> {
  const destination = path.join(acceptanceRoot, "packages");
  const packed = await run("npm", ["pack", "--ignore-scripts", "--pack-destination", destination], {
    cwd: root,
    timeoutMs: 60_000,
  });
  expect(packed, packed.stderr || packed.stdout).toMatchObject({ exitCode: 0 });
  const tarball = path.join(destination, filename);
  const stats = await lstat(tarball);
  expect(stats.isFile()).toBe(true);
  expect(stats.isSymbolicLink()).toBe(false);
  return tarball;
}

async function packageVersion(packagePath: string): Promise<string> {
  const value: unknown = JSON.parse(await readFile(packagePath, "utf8"));
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    typeof value.version !== "string"
  ) {
    throw new Error(`Package at ${packagePath} has no version.`);
  }
  return value.version;
}

async function runHabitat(args: readonly string[]): Promise<CommandResult> {
  return run(habitatExecutable, args, { cwd: consumerRoot, timeoutMs: 120_000 });
}

async function run(
  executable: string,
  args: readonly string[],
  options: {
    readonly cwd?: string;
    readonly env?: NodeJS.ProcessEnv;
    readonly timeoutMs?: number;
  } = {}
): Promise<CommandResult> {
  const env = childEnvironment(options.env);
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd ?? workspaceRoot,
      env,
      shell: process.platform === "win32",
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    let settled = false;
    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      finish();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      settle(() => reject(new Error(`${executable} exceeded its native Oclif timeout.`)));
    }, options.timeoutMs ?? 30_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => stdout.push(chunk));
    child.stderr.on("data", (chunk: string) => stderr.push(chunk));
    child.on("error", (error) => settle(() => reject(error)));
    child.on("close", (exitCode) =>
      settle(() =>
        resolve({
          exitCode: exitCode ?? 1,
          stderr: stderr.join(""),
          stdout: stdout.join(""),
        })
      )
    );
  });
}

function childEnvironment(overrides?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const runtimeRoot = path.join(acceptanceRoot, "runtime");
  const env: NodeJS.ProcessEnv = {
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    CLAUDE_CONFIG_DIR: path.join(runtimeRoot, "claude-home"),
    CODEX_HOME: path.join(runtimeRoot, "codex-home"),
    HABITAT_CACHE_DIR: path.join(runtimeRoot, "cache/habitat"),
    HABITAT_CONFIG_DIR: path.join(runtimeRoot, "config/habitat"),
    HABITAT_DATA_DIR: path.join(runtimeRoot, "data/habitat"),
    HABITAT_NPM_REGISTRY: PUBLIC_NPM_REGISTRY,
    HOME: path.join(runtimeRoot, "home"),
    LANG: process.env.LANG,
    LC_ALL: process.env.LC_ALL,
    NODE_ENV: "production",
    NO_COLOR: "1",
    NPM_CONFIG_CACHE: path.join(runtimeRoot, "cache/npm"),
    NPM_CONFIG_GLOBALCONFIG: path.join(runtimeRoot, "config/npm-globalrc"),
    NPM_CONFIG_PREFIX: path.join(runtimeRoot, "npm-prefix"),
    NPM_CONFIG_REGISTRY: PUBLIC_NPM_REGISTRY,
    NPM_CONFIG_USERCONFIG: path.join(runtimeRoot, "config/npmrc"),
    PATH: [
      path.join(consumerRoot, "node_modules/.bin"),
      path.dirname(process.execPath),
      process.env.PATH,
    ]
      .filter(Boolean)
      .join(path.delimiter),
    PATHEXT: process.env.PATHEXT,
    SystemRoot: process.env.SystemRoot,
    TEMP: path.join(runtimeRoot, "tmp"),
    TMP: path.join(runtimeRoot, "tmp"),
    TMPDIR: path.join(runtimeRoot, "tmp"),
    WINDIR: process.env.WINDIR,
    XDG_CACHE_HOME: path.join(runtimeRoot, "cache"),
    XDG_CONFIG_HOME: path.join(runtimeRoot, "config"),
    XDG_DATA_HOME: path.join(runtimeRoot, "data"),
    ...overrides,
  };
  for (const name of gitLocalEnvironmentVariables) delete env[name];
  delete env.FORCE_COLOR;
  return env;
}

async function providerState() {
  const runtimeRoot = path.join(acceptanceRoot, "runtime");
  return {
    claude: await readFile(path.join(runtimeRoot, "claude-home/sentinel"), "utf8"),
    codex: await readFile(path.join(runtimeRoot, "codex-home/sentinel"), "utf8"),
  };
}

async function removeOwnedFixture(root: string): Promise<void> {
  const stats = await lstat(root);
  const canonical = await realpath(root);
  const basename = path.basename(canonical);
  const suffix = basename.slice(FIXTURE_PREFIX.length);
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    canonical !== root ||
    path.dirname(canonical) !== temporaryParent ||
    !basename.startsWith(FIXTURE_PREFIX) ||
    suffix.length !== 6 ||
    !/^[A-Za-z0-9]+$/u.test(suffix)
  ) {
    throw new Error(`Refusing to remove unexpected native Oclif fixture: ${root}`);
  }
  await rm(canonical, { recursive: true, force: false });
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
