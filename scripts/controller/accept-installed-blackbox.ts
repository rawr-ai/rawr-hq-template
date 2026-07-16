import { spawn } from "node:child_process";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { controllerLauncherPath } from "./layout.ts";
import { installProductionController } from "./production/builder.ts";
import { PROTECTED_CONTROLLER_SOURCE_PATTERNS } from "./production/constants.ts";
import { scrubbedBunEnvironment } from "./production/process.ts";
import { requireVerifiedOfficialControllerRelease } from "./production/verify-official.ts";

const ACCEPTANCE_ROOT_PREFIX = "rawr-controller-installed-acceptance-";
const HELLO_OUTPUT = "hello from guarded external extension";

type ProcessResult = Readonly<{
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}>;

type LauncherRun = Readonly<{
  argv: readonly string[];
  result: ProcessResult;
}>;

async function runCaptured(input: Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
}>): Promise<ProcessResult> {
  return await new Promise<ProcessResult>((resolveProcess, rejectProcess) => {
    const child = spawn(input.executable, [...input.args], {
      cwd: input.cwd,
      env: input.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", rejectProcess);
    child.once("exit", (code, signal) => {
      resolveProcess({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

function requireSuccess(result: ProcessResult, label: string): void {
  if (result.code === 0 && result.signal === null) return;
  throw new Error(
    `${label} failed (${result.signal ?? `exit ${String(result.code)}`}): ${result.stderr.trim()}`,
  );
}

function requireFailure(result: ProcessResult, label: string): void {
  if (result.code !== 0 || result.signal !== null) return;
  throw new Error(`${label} unexpectedly succeeded: ${result.stdout.trim()}`);
}

function requireIncludes(text: string, expected: string, label: string): void {
  if (text.includes(expected)) return;
  throw new Error(`${label} did not include ${JSON.stringify(expected)}: ${text.trim()}`);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`${label} is not an object`);
}

function parseJsonResult(result: ProcessResult, label: string): Record<string, unknown> {
  try {
    return requireRecord(JSON.parse(result.stdout) as unknown, label);
  } catch (error) {
    throw new Error(`${label} did not emit valid JSON: ${result.stdout.trim()}`, { cause: error });
  }
}

function requireJsonData(result: ProcessResult, label: string): Record<string, unknown> {
  const parsed = parseJsonResult(result, label);
  if (parsed.ok !== true) throw new Error(`${label} did not report ok: ${result.stdout.trim()}`);
  return requireRecord(parsed.data, `${label} data`);
}

function requireJsonErrorDetails(result: ProcessResult, label: string): Record<string, unknown> {
  const parsed = parseJsonResult(result, label);
  if (parsed.ok !== false) throw new Error(`${label} did not report a structured failure`);
  const error = requireRecord(parsed.error, `${label} error`);
  return requireRecord(error.details, `${label} error details`);
}

function requireOperationDisposition(
  result: ProcessResult,
  operation: string,
  disposition: string,
  label: string,
): Record<string, unknown> {
  const data = requireJsonData(result, label);
  if (data.operation !== operation || data.disposition !== disposition) {
    throw new Error(`${label} reported an unexpected operation: ${result.stdout.trim()}`);
  }
  return data;
}

function requireInspection(
  result: ProcessResult,
  state: "active" | "quarantined",
  label: string,
): Record<string, unknown> {
  const data = requireJsonData(result, label);
  if (data.found !== true || data.state !== state) {
    throw new Error(`${label} did not report ${state}: ${result.stdout.trim()}`);
  }
  return requireRecord(data.value, `${label} value`);
}

function isMissing(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "ENOENT";
}

async function requireMissing(target: string, label: string): Promise<void> {
  try {
    await lstat(target);
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  throw new Error(`${label} unexpectedly exists: ${target}`);
}

function snapshotFilter(workspaceRoot: string): (source: string) => boolean {
  return (source) => {
    const relative = path.relative(workspaceRoot, source).split(path.sep).join("/");
    if (relative === "") return true;
    const segments = relative.split("/");
    if (
      segments[0] === "node_modules"
      || segments.includes("dist")
      || segments.includes("coverage")
      || segments.includes(".nx")
      || segments.includes(".turbo")
      || segments[0] === ".git"
    ) return false;
    return !PROTECTED_CONTROLLER_SOURCE_PATTERNS.some((pattern) => pattern.test(relative));
  };
}

async function initializeSnapshotRepository(sourceRoot: string): Promise<void> {
  for (const [args, label] of [
    [["init", "--quiet", "--initial-branch=main"], "git init"],
    [["add", "--all"], "git add"],
    [
      [
        "-c",
        "user.name=RAWR Controller Acceptance",
        "-c",
        "user.email=controller-acceptance@invalid.local",
        "commit",
        "--quiet",
        "-m",
        "test(controller): snapshot installed black-box source",
      ],
      "git commit",
    ],
  ] as const) {
    const result = await runCaptured({ executable: "git", args, cwd: sourceRoot });
    requireSuccess(result, label);
  }
}

async function removeAcceptanceRoot(root: string): Promise<void> {
  const canonicalTemporaryRoot = await realpath(tmpdir());
  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(root);
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  const status = await lstat(canonicalRoot);
  if (
    !status.isDirectory()
    || canonicalRoot !== root
    || path.dirname(canonicalRoot) !== canonicalTemporaryRoot
    || !path.basename(canonicalRoot).startsWith(ACCEPTANCE_ROOT_PREFIX)
  ) {
    throw new Error(`refusing to remove invalid controller acceptance root: ${root}`);
  }
  await rm(canonicalRoot, { recursive: true, force: true });
}

async function removeSourceSnapshot(acceptanceRoot: string, sourceRoot: string): Promise<void> {
  const canonicalTemporaryRoot = await realpath(tmpdir());
  const canonicalAcceptanceRoot = await realpath(acceptanceRoot);
  const canonicalSourceRoot = await realpath(sourceRoot);
  const sourceStatus = await lstat(sourceRoot);
  if (
    canonicalAcceptanceRoot !== acceptanceRoot
    || path.dirname(canonicalAcceptanceRoot) !== canonicalTemporaryRoot
    || !path.basename(canonicalAcceptanceRoot).startsWith(ACCEPTANCE_ROOT_PREFIX)
    || !sourceStatus.isDirectory()
    || sourceStatus.isSymbolicLink()
    || canonicalSourceRoot !== sourceRoot
    || path.dirname(canonicalSourceRoot) !== canonicalAcceptanceRoot
    || path.basename(canonicalSourceRoot) !== "source"
  ) {
    throw new Error(`refusing to remove invalid controller source snapshot: ${sourceRoot}`);
  }
  await rm(canonicalSourceRoot, { recursive: true, force: true });
}

async function runOuter(): Promise<void> {
  const workspaceRoot = await realpath(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  );
  const temporaryRoot = await realpath(tmpdir());
  const acceptanceRoot = await realpath(
    await mkdtemp(path.join(temporaryRoot, ACCEPTANCE_ROOT_PREFIX)),
  );
  const sourceRoot = path.join(acceptanceRoot, "source");
  let primaryError: unknown;
  try {
    await cp(workspaceRoot, sourceRoot, {
      recursive: true,
      force: false,
      errorOnExist: true,
      filter: snapshotFilter(workspaceRoot),
      preserveTimestamps: true,
      verbatimSymlinks: true,
    });
    await initializeSnapshotRepository(sourceRoot);
    await writeFile(path.join(sourceRoot, ".git", "info", "exclude"), "node_modules\n", {
      flag: "a",
    });
    await symlink(path.join(workspaceRoot, "node_modules"), path.join(sourceRoot, "node_modules"));

    const innerScript = path.join(sourceRoot, "scripts", "controller", "accept-installed-blackbox.ts");
    const result = await runCaptured({
      executable: process.execPath,
      args: [
        "--config=/dev/null",
        "--no-env-file",
        "--no-install",
        innerScript,
        "--inner",
        acceptanceRoot,
      ],
      cwd: sourceRoot,
      env: scrubbedBunEnvironment({
        BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
      }),
    });
    if (result.stdout.length > 0) process.stdout.write(result.stdout);
    if (result.stderr.length > 0) process.stderr.write(result.stderr);
    requireSuccess(result, "installed controller black-box acceptance");
  } catch (error) {
    primaryError = error;
  }
  let cleanupError: unknown;
  try {
    await removeAcceptanceRoot(acceptanceRoot);
  } catch (error) {
    cleanupError = error;
  }
  if (primaryError !== undefined && cleanupError !== undefined) {
    throw new AggregateError(
      [primaryError, cleanupError],
      "installed controller acceptance failed and guarded cleanup also failed",
    );
  }
  if (primaryError !== undefined) throw primaryError;
  if (cleanupError !== undefined) throw cleanupError;
}

async function writeExternalHelloFixture(input: Readonly<{
  pluginRoot: string;
  releaseRoot: string;
}>): Promise<string> {
  const commandRoot = path.join(input.pluginRoot, "dist", "commands");
  const commandPath = path.join(commandRoot, "hello.js");
  await Promise.all([
    mkdir(commandRoot, { recursive: true }),
    mkdir(path.join(input.pluginRoot, "dist", "hooks"), { recursive: true }),
    mkdir(path.join(input.pluginRoot, "node_modules", "@oclif"), { recursive: true }),
  ]);
  await symlink(
    path.join(input.releaseRoot, "app", "node_modules", "@oclif", "core"),
    path.join(input.pluginRoot, "node_modules", "@oclif", "core"),
  );
  await Promise.all([
    writeFile(
      path.join(input.pluginRoot, "package.json"),
      `${JSON.stringify({
        name: "@rawr/plugin-hello",
        version: "1.0.0",
        type: "module",
        dependencies: { "@oclif/core": "4.8.0" },
        oclif: {
          commands: "./dist/commands",
          hooks: { init: "./dist/hooks/init.js" },
          topicSeparator: " ",
        },
      }, null, 2)}\n`,
    ),
    writeFile(
      path.join(input.pluginRoot, "oclif.manifest.json"),
      `${JSON.stringify({
        version: "1.0.0",
        commands: {
          hello: {
            id: "hello",
            isESM: true,
            aliases: [],
            hiddenAliases: [],
            relativePath: ["dist", "commands", "hello.js"],
          },
        },
      }, null, 2)}\n`,
    ),
    writeFile(
      commandPath,
      [
        'import { Command } from "@oclif/core";',
        "export default class Hello extends Command {",
        "  static description = \"External controller acceptance fixture\";",
        "  async run() {",
        '    if (process.env.RAWR_HOSTILE_ENV !== undefined) throw new Error("hostile dotenv loaded");',
        `    this.log(${JSON.stringify(HELLO_OUTPUT)});`,
        "  }",
        "}",
        "",
      ].join("\n"),
    ),
    writeFile(
      path.join(input.pluginRoot, "dist", "hooks", "init.js"),
      [
        "export default async function mutateAmbientControllerInputs() {",
        '  process.argv[1] = "/hostile/alternate-entry.mjs";',
        '  process.env.RAWR_CONTROLLER_DIGEST = "f".repeat(64);',
        '  process.env.RAWR_CONTROLLER_RELEASE_ROOT = "/hostile/alternate-release";',
        '  process.env.RAWR_DATA_DIR = "/hostile/alternate-data";',
        '  process.env.HOME = "/hostile/home";',
        '  process.env.XDG_CONFIG_HOME = "/hostile/config";',
        `  process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH = ${JSON.stringify(path.join(input.pluginRoot, "hostile-transpiler-cache"))};`,
        "}",
        "",
      ].join("\n"),
    ),
  ]);
  return commandPath;
}

async function writeHostileOperatorFixture(root: string): Promise<Readonly<{
  cwd: string;
  env: NodeJS.ProcessEnv;
  preloadSentinel: string;
  packageScriptSentinel: string;
}>> {
  const cwd = path.join(root, "foreign-content-workspace");
  const home = path.join(root, "operator-home");
  const configHome = path.join(home, "config");
  const dataHome = path.join(home, "data");
  const stateHome = path.join(home, "state");
  const cacheHome = path.join(home, "cache");
  const temporaryDirectory = path.join(root, "operator-tmp");
  const preloadSentinel = path.join(root, "ambient-preload-executed");
  const packageScriptSentinel = path.join(root, "ambient-package-script-executed");
  const preloadPath = path.join(cwd, "preload.cjs");
  await Promise.all([
    mkdir(cwd, { recursive: true }),
    mkdir(path.join(cwd, "plugins"), { recursive: true }),
    mkdir(configHome, { recursive: true }),
    mkdir(dataHome, { recursive: true }),
    mkdir(stateHome, { recursive: true }),
    mkdir(cacheHome, { recursive: true }),
    mkdir(temporaryDirectory, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      preloadPath,
      `require("node:fs").writeFileSync(${JSON.stringify(preloadSentinel)}, "executed");\n`,
    ),
    writeFile(path.join(cwd, "bunfig.toml"), `preload = [${JSON.stringify(preloadPath)}]\n`),
    writeFile(path.join(configHome, "bunfig.toml"), `preload = [${JSON.stringify(preloadPath)}]\n`),
    writeFile(path.join(cwd, ".env"), "RAWR_HOSTILE_ENV=loaded-from-dotenv\n"),
    writeFile(
      path.join(cwd, "package.json"),
      `${JSON.stringify({
        name: "hostile-content-workspace",
        private: true,
        scripts: {
          preinstall: `printf executed > ${JSON.stringify(packageScriptSentinel)}`,
        },
      }, null, 2)}\n`,
    ),
  ]);
  return {
    cwd,
    preloadSentinel,
    packageScriptSentinel,
    env: {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: configHome,
      XDG_DATA_HOME: dataHome,
      XDG_STATE_HOME: stateHome,
      XDG_CACHE_HOME: cacheHome,
      TMPDIR: temporaryDirectory,
      BUN_CONFIG: path.join(cwd, "bunfig.toml"),
      BUN_INSTALL: path.join(cwd, "hostile-bun-install"),
      BUN_INSTALL_CACHE_DIR: path.join(cwd, "hostile-bun-cache"),
      BUN_OPTIONS: `--preload=${preloadPath}`,
      BUN_PRELOAD: preloadPath,
      BUN_WORKSPACE: cwd,
      NODE_OPTIONS: `--require=${preloadPath}`,
      NODE_PATH: cwd,
    },
  };
}

async function runInner(acceptanceRootInput: string): Promise<void> {
  const acceptanceRoot = await realpath(acceptanceRootInput);
  const sourceRoot = path.join(acceptanceRoot, "source");
  const dataRoot = path.join(acceptanceRoot, "controller-data");
  const sourceStatus = await runCaptured({
    executable: "git",
    args: ["status", "--porcelain=v1", "--untracked-files=all"],
    cwd: sourceRoot,
  });
  requireSuccess(sourceStatus, "snapshot git status");
  if (sourceStatus.stdout.length !== 0) {
    throw new Error(`controller acceptance snapshot is dirty:\n${sourceStatus.stdout}`);
  }
  const installed = await installProductionController({
    workspaceRoot: sourceRoot,
    dataRoot,
    bunBinary: process.execPath,
  });
  const verified = await requireVerifiedOfficialControllerRelease({
    releaseRoot: installed.release.releaseRoot,
    expectedDigest: installed.release.controllerDigest,
  });
  const officialCommandIds = [...new Set(
    verified.envelope.manifest.officialMembers.flatMap((member) => member.commandIds),
  )].sort();
  if (officialCommandIds.length === 0) {
    throw new Error("production controller manifest contains no official commands");
  }
  const launcher = controllerLauncherPath(dataRoot);
  const pluginRoot = path.join(acceptanceRoot, "external-hello");
  const helloCommandPath = await writeExternalHelloFixture({
    pluginRoot,
    releaseRoot: installed.release.releaseRoot,
  });
  const hostile = await writeHostileOperatorFixture(acceptanceRoot);
  hostile.env.RAWR_DATA_DIR = dataRoot;
  hostile.env.PATH = `${path.dirname(launcher)}${path.delimiter}${hostile.env.PATH ?? ""}`;
  const helloManifestPath = path.join(pluginRoot, "oclif.manifest.json");
  const originalHelloCommand = await readFile(helloCommandPath, "utf8");
  const originalHelloManifest = await readFile(helloManifestPath, "utf8");

  process.chdir(acceptanceRoot);
  await removeSourceSnapshot(acceptanceRoot, sourceRoot);
  await requireMissing(sourceRoot, "Template source snapshot");

  const runs: LauncherRun[] = [];
  const invoke = async (argv: readonly string[], label: string): Promise<ProcessResult> => {
    const result = await runCaptured({
      executable: launcher,
      args: argv,
      cwd: hostile.cwd,
      env: hostile.env,
    });
    runs.push({ argv, result });
    await requireMissing(hostile.preloadSentinel, `${label} ambient preload sentinel`);
    await requireMissing(hostile.packageScriptSentinel, `${label} package script sentinel`);
    return result;
  };

  const version = await invoke(["--version"], "version");
  requireSuccess(version, "installed rawr --version");
  requireIncludes(version.stdout, "rawr/", "installed rawr --version");

  const help = await invoke(["--help"], "help");
  requireSuccess(help, "installed rawr --help");
  requireIncludes(help.stdout, "USAGE", "installed rawr --help");

  const nestedSnapshotRoot = path.join(hostile.cwd, ".rawr", "nested-controller-proof");
  const nestedSnapshot = await invoke(
    ["routine", "snapshot", "--json", "--out", nestedSnapshotRoot],
    "nested installed controller snapshot",
  );
  requireSuccess(nestedSnapshot, "installed nested controller snapshot");
  const nestedSnapshotData = requireRecord(
    JSON.parse(await readFile(path.join(nestedSnapshotRoot, "snapshot.json"), "utf8")) as unknown,
    "nested installed controller snapshot data",
  );
  if (
    typeof nestedSnapshotData.rawrVersion !== "string"
    || !nestedSnapshotData.rawrVersion.includes("rawr/")
    || typeof nestedSnapshotData.bunVersion !== "string"
    || nestedSnapshotData.bunVersion.length === 0
  ) {
    throw new Error(
      `nested installed controller did not reenter its bundled runtime: ${JSON.stringify(nestedSnapshotData)}`,
    );
  }

  const doctor = await invoke(["doctor", "global", "--json"], "global doctor");
  requireSuccess(doctor, "installed rawr doctor global");
  const doctorData = requireJsonData(doctor, "installed rawr doctor global");
  const doctorSelector = requireRecord(doctorData.selector, "global doctor selector");
  const doctorInvocation = requireRecord(doctorData.invocation, "global doctor invocation");
  const doctorRelease = requireRecord(doctorData.release, "global doctor release");
  const doctorResolution = requireRecord(doctorData.globalResolution, "global doctor resolution");
  if (
    doctorData.healthy !== true
    || doctorSelector.controllerDigest !== installed.release.controllerDigest
    || doctorInvocation.controllerDigest !== installed.release.controllerDigest
    || doctorRelease.root !== installed.release.releaseRoot
    || doctorRelease.sourceRevision !== installed.sourceRevision
    || doctorResolution.matchesLauncher !== true
  ) {
    throw new Error(`installed global doctor did not prove selected release provenance: ${doctor.stdout.trim()}`);
  }

  const emptyList = await invoke(["plugins", "list"], "empty plugins list");
  requireSuccess(emptyList, "installed rawr plugins list");
  requireIncludes(emptyList.stdout, "No external CLI extensions installed", "empty plugins list");

  const emptyReset = await invoke(["plugins", "reset", "--json"], "empty plugins reset");
  requireSuccess(emptyReset, "installed rawr plugins reset when empty");
  const emptyResetData = requireOperationDisposition(
    emptyReset,
    "reset",
    "converged",
    "empty plugins reset",
  );
  if ("nativeStatus" in emptyResetData) {
    throw new Error("empty plugins reset delegated to the native manager");
  }

  const absentHello = await invoke(["hello"], "absent external hello");
  requireFailure(absentHello, "external hello before link");

  for (const commandId of officialCommandIds) {
    const commandHelp = await invoke([...commandId.split(":"), "--help"], `official ${commandId}`);
    requireSuccess(commandHelp, `installed official command ${commandId}`);
    if (`${commandHelp.stdout}\n${commandHelp.stderr}`.toLowerCase().includes("not found")) {
      throw new Error(`installed official command ${commandId} was not discovered`);
    }
  }

  const linked = await invoke(["plugins", "link", pluginRoot], "external link");
  requireSuccess(linked, "installed rawr plugins link");
  requireIncludes(linked.stdout, "link: delegate-native", "external link");

  const relinked = await invoke(["plugins", "link", pluginRoot, "--json"], "converged external link");
  requireSuccess(relinked, "installed rawr plugins link when converged");
  const relinkedData = requireOperationDisposition(
    relinked,
    "link",
    "converged",
    "converged external link",
  );
  if ("nativeStatus" in relinkedData) {
    throw new Error("converged external link delegated to the native manager");
  }

  const hookSnapshotRoot = path.join(hostile.cwd, ".rawr", "hook-reentry-proof");
  const hookSnapshot = await invoke(
    ["routine", "snapshot", "--json", "--out", hookSnapshotRoot],
    "nested controller snapshot after hostile init hook",
  );
  requireSuccess(hookSnapshot, "nested controller snapshot after hostile init hook");
  await requireMissing(
    path.join(pluginRoot, "hostile-transpiler-cache"),
    "hostile-hook transpiler cache",
  );
  const hookSnapshotData = requireRecord(
    JSON.parse(await readFile(path.join(hookSnapshotRoot, "snapshot.json"), "utf8")) as unknown,
    "hostile-hook nested controller snapshot data",
  );
  if (
    typeof hookSnapshotData.rawrVersion !== "string"
    || !hookSnapshotData.rawrVersion.includes("rawr/")
  ) {
    throw new Error(
      `hostile init hook rewrote nested controller authority: ${JSON.stringify(hookSnapshotData)}`,
    );
  }

  const activeList = await invoke(["plugins", "list"], "active plugins list");
  requireSuccess(activeList, "installed rawr plugins list after link");
  requireIncludes(activeList.stdout, "@rawr/plugin-hello@1.0.0 (active)", "active plugins list");

  const activeInspection = await invoke(
    ["plugins", "inspect", "@rawr/plugin-hello", "--json"],
    "active plugin inspection",
  );
  requireSuccess(activeInspection, "installed rawr plugins inspect active extension");
  requireInspection(activeInspection, "active", "active plugin inspection");

  const hello = await invoke(["hello"], "external hello");
  requireSuccess(hello, "installed rawr hello");
  requireIncludes(hello.stdout, HELLO_OUTPUT, "external hello");

  const missingPluginRoot = `${pluginRoot}.missing`;
  await rename(pluginRoot, missingPluginRoot);
  const missingList = await invoke(["plugins", "list"], "missing plugin list");
  requireSuccess(missingList, "installed rawr plugins list with missing linked root");
  requireIncludes(missingList.stdout, "@rawr/plugin-hello (quarantined:", "missing plugin list");
  const missingInspection = await invoke(
    ["plugins", "inspect", "@rawr/plugin-hello", "--json"],
    "missing plugin inspection",
  );
  requireSuccess(missingInspection, "installed rawr plugins inspect missing linked root");
  const missingValue = requireInspection(missingInspection, "quarantined", "missing plugin inspection");
  const missingReason = requireRecord(missingValue.reason, "missing plugin quarantine reason");
  if (missingReason.code !== "root-missing") {
    throw new Error(`missing linked root reported the wrong quarantine: ${missingInspection.stdout.trim()}`);
  }

  const unhealthyDoctor = await invoke(
    ["doctor", "global", "--json"],
    "global doctor with missing plugin",
  );
  requireFailure(unhealthyDoctor, "global doctor with missing plugin");
  const unhealthyData = requireJsonErrorDetails(unhealthyDoctor, "global doctor with missing plugin");
  const unhealthyExtensions = requireRecord(
    unhealthyData.externalExtensions,
    "unhealthy global doctor external extensions",
  );
  if (unhealthyData.healthy !== false || !Array.isArray(unhealthyExtensions.quarantined)) {
    throw new Error(`global doctor did not diagnose the missing extension: ${unhealthyDoctor.stdout.trim()}`);
  }

  const removedMissing = await invoke(
    ["plugins", "uninstall", "@rawr/plugin-hello"],
    "missing extension uninstall",
  );
  requireSuccess(removedMissing, "installed rawr plugins uninstall missing linked root");
  requireIncludes(removedMissing.stdout, "uninstall: delegate-native", "missing extension uninstall");
  await rename(missingPluginRoot, pluginRoot);

  const collisionRelink = await invoke(["plugins", "link", pluginRoot], "collision fixture link");
  requireSuccess(collisionRelink, "installed rawr plugins link before collision");
  const collisionCommandId = officialCommandIds[0]!;
  const collidingManifest = requireRecord(
    JSON.parse(originalHelloManifest) as unknown,
    "external hello command manifest",
  );
  collidingManifest.commands = {
    [collisionCommandId]: {
      id: collisionCommandId,
      isESM: true,
      aliases: [],
      hiddenAliases: [],
      relativePath: ["dist", "commands", "hello.js"],
    },
  };
  await writeFile(helloManifestPath, `${JSON.stringify(collidingManifest, null, 2)}\n`);
  const collisionList = await invoke(["plugins", "list"], "colliding plugin list");
  requireSuccess(collisionList, "installed rawr plugins list with reserved collision");
  requireIncludes(collisionList.stdout, "@rawr/plugin-hello (quarantined:", "colliding plugin list");
  const collisionInspection = await invoke(
    ["plugins", "inspect", "@rawr/plugin-hello", "--json"],
    "colliding plugin inspection",
  );
  requireSuccess(collisionInspection, "installed rawr plugins inspect reserved collision");
  const collisionValue = requireInspection(
    collisionInspection,
    "quarantined",
    "colliding plugin inspection",
  );
  const collisionReason = requireRecord(collisionValue.reason, "collision quarantine reason");
  if (collisionReason.code !== "reserved-surface-collision") {
    throw new Error(`reserved collision reported the wrong quarantine: ${collisionInspection.stdout.trim()}`);
  }
  const collisionOfficialHelp = await invoke(
    [...collisionCommandId.split(":"), "--help"],
    "official command under collision",
  );
  requireSuccess(collisionOfficialHelp, "official command under external collision");
  const removedCollision = await invoke(
    ["plugins", "uninstall", "@rawr/plugin-hello"],
    "colliding extension uninstall",
  );
  requireSuccess(removedCollision, "installed rawr plugins uninstall colliding extension");
  await writeFile(helloManifestPath, originalHelloManifest);

  const throwingRelink = await invoke(["plugins", "link", pluginRoot], "throwing fixture link");
  requireSuccess(throwingRelink, "installed rawr plugins link before throwing command");
  await writeFile(
    helloCommandPath,
    originalHelloCommand.replace(
      `    this.log(${JSON.stringify(HELLO_OUTPUT)});`,
      '    throw new Error("external controller acceptance throw");',
    ),
  );
  const throwingHello = await invoke(["hello"], "throwing external hello");
  requireFailure(throwingHello, "throwing external hello");
  requireIncludes(
    `${throwingHello.stdout}\n${throwingHello.stderr}`,
    "external controller acceptance throw",
    "throwing external hello",
  );
  const throwingList = await invoke(["plugins", "list"], "throwing plugin list");
  requireSuccess(throwingList, "installed rawr plugins list with throwing extension");
  requireIncludes(throwingList.stdout, "@rawr/plugin-hello@1.0.0 (active)", "throwing plugin list");
  const throwingInspection = await invoke(
    ["plugins", "inspect", "@rawr/plugin-hello", "--json"],
    "throwing plugin inspection",
  );
  requireSuccess(throwingInspection, "installed rawr plugins inspect throwing extension");
  requireInspection(throwingInspection, "active", "throwing plugin inspection");
  const removedThrowing = await invoke(
    ["plugins", "uninstall", "@rawr/plugin-hello"],
    "throwing extension uninstall",
  );
  requireSuccess(removedThrowing, "installed rawr plugins uninstall throwing extension");
  await writeFile(helloCommandPath, originalHelloCommand);

  const recoveredList = await invoke(["plugins", "list"], "recovered plugins list");
  requireSuccess(recoveredList, "installed rawr plugins list after recovery");
  requireIncludes(
    recoveredList.stdout,
    "No external CLI extensions installed",
    "recovered plugins list",
  );

  const recoveredHello = await invoke(["hello"], "recovered absent external hello");
  requireFailure(recoveredHello, "external hello after uninstall");

  const recoveredReset = await invoke(["plugins", "reset", "--json"], "recovered plugins reset");
  requireSuccess(recoveredReset, "installed rawr plugins reset after recovery");
  const recoveredResetData = requireOperationDisposition(
    recoveredReset,
    "reset",
    "converged",
    "recovered plugins reset",
  );
  if ("nativeStatus" in recoveredResetData) {
    throw new Error("recovered empty plugins reset delegated to the native manager");
  }

  const proof = {
    status: "passed",
    controllerDigest: installed.release.controllerDigest,
    releaseKind: installed.release.kind,
    sourceRevision: installed.sourceRevision,
    sourceRemoved: true,
    freshProcesses: runs.length,
    officialCommands: {
      startup: ["--version", "--help", "routine snapshot", "doctor global", "plugins list", "plugins reset"],
      manifestCommandCount: officialCommandIds.length,
      manifestCommandIds: officialCommandIds,
    },
    externalLifecycle: [
      "empty-reset",
      "link",
      "link-converged",
      "active-inspect",
      "execute",
      "missing-root-diagnose-uninstall",
      "reserved-collision-diagnose-uninstall",
      "throwing-command-diagnose-uninstall",
      "recovered-reset",
    ],
    ambientStartupExecuted: false,
  } as const;
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    await runOuter();
    return;
  }
  if (args.length === 2 && args[0] === "--inner" && path.isAbsolute(args[1]!)) {
    await runInner(args[1]!);
    return;
  }
  throw new Error("usage: bun scripts/controller/accept-installed-blackbox.ts");
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
