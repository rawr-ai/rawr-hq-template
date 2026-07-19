import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

import {
  canonicalSerializeAgentPluginReleaseInput,
  createAgentPluginPayload,
  createAgentPluginReleaseInput,
} from "@rawr/agent-plugin-lifecycle/release";

import { controllerLauncherPath } from "./layout.ts";
import { installProductionController } from "./production/builder.ts";
import { PROTECTED_CONTROLLER_SOURCE_PATTERNS } from "./production/constants.ts";
import { scrubbedBunEnvironment } from "./production/process.ts";
import { requireVerifiedOfficialControllerRelease } from "./production/verify-official.ts";

const ACCEPTANCE_ROOT_PREFIX = "rawr-controller-installed-acceptance-";
const HELLO_OUTPUT = "hello from guarded external extension";
const FIXTURE_SKILL_BYTES = new TextEncoder().encode("# Fixture\n");
const EXPECTED_AGENT_PLUGIN_COMMAND_IDS = Object.freeze([
  "agent:plugins:attest-promotion",
  "agent:plugins:build",
  "agent:plugins:check",
  "agent:plugins:create",
  "agent:plugins:export",
  "agent:plugins:package",
  "agent:plugins:status",
  "agent:plugins:sync",
  "agent:plugins:test",
  "agent:plugins:undo",
  "agent:plugins:vendors:status",
  "agent:plugins:vendors:update",
] as const);
const EXPECTED_EXTERNAL_PLUGIN_COMMAND_IDS = Object.freeze([
  "plugins:inspect",
  "plugins:install",
  "plugins:link",
  "plugins:list",
  "plugins:reset",
  "plugins:uninstall",
  "plugins:update",
] as const);
const RETIRED_CURATED_COMMANDS = Object.freeze([
  { argv: ["undo"], label: "retired root undo" },
  { argv: ["agent", "sync"], label: "retired agent sync aggregate" },
  { argv: ["agent", "plugins", "retire"], label: "retired receipt-owned provider command" },
  { argv: ["plugins", "export"], label: "retired bare plugins export" },
  { argv: ["plugins", "improve"], label: "retired bare plugins improve" },
  { argv: ["plugins", "lifecycle", "check"], label: "retired bare plugins lifecycle" },
  { argv: ["plugins", "status"], label: "retired bare plugins status" },
  { argv: ["plugins", "sweep"], label: "retired bare plugins sweep" },
  { argv: ["plugins", "sync"], label: "retired bare plugins sync" },
] as const);
const CODEX_MUTABLE_OPERATIONAL_FILES = new Set([
  "goals_1.sqlite",
  "logs_2.sqlite",
  "memories_1.sqlite",
  "state_5.sqlite",
]);
const CODEX_TRANSIENT_OPERATIONAL_FILES = new Set(
  [...CODEX_MUTABLE_OPERATIONAL_FILES]
    .flatMap((file) => [`${file}-shm`, `${file}-wal`]),
);
const CODEX_MUTABLE_OPERATIONAL_DIRECTORIES = new Set(["tmp/arg0"]);

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

type FilesystemReceipt = Readonly<{
  path: string;
  kind: "directory" | "file" | "missing" | "symlink";
  mode?: number;
  size?: number;
  mtimeMs?: number;
  digest?: string;
  link?: string;
}>;

type LifecycleContentFixture = Readonly<{
  root: string;
  repositoryIdentity: string;
  contentAuthority: string;
  refName: string;
  sourceCommit: string;
  sourceTree: string;
  releaseInputPath: string;
  gitExecutable: string;
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
    `${label} failed (${result.signal ?? `exit ${String(result.code)}`}): stdout=${result.stdout.trim()} stderr=${result.stderr.trim()}`,
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

function requireExactStrings(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) === JSON.stringify(expectedSorted)) return;
  throw new Error(
    `${label} differs: expected ${expectedSorted.join(",")}; received ${actualSorted.join(",")}`,
  );
}

function describeFilesystemDifference(
  before: readonly FilesystemReceipt[],
  after: readonly FilesystemReceipt[],
): string {
  const beforeByPath = new Map(before.map((receipt) => [receipt.path, receipt]));
  const afterByPath = new Map(after.map((receipt) => [receipt.path, receipt]));
  return [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])]
    .sort()
    .flatMap((entryPath) => {
      const prior = beforeByPath.get(entryPath);
      const next = afterByPath.get(entryPath);
      return JSON.stringify(prior) === JSON.stringify(next)
        ? []
        : [`${entryPath || "."}: ${JSON.stringify(prior)} -> ${JSON.stringify(next)}`];
    })
    .join("; ");
}

function requireOnlyCodexOperationalStateChanged(
  before: readonly FilesystemReceipt[],
  after: readonly FilesystemReceipt[],
  label: string,
): void {
  const beforeByPath = new Map(before.map((receipt) => [receipt.path, receipt]));
  const afterByPath = new Map(after.map((receipt) => [receipt.path, receipt]));
  const changed = [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])]
    .sort()
    .filter((entryPath) =>
      JSON.stringify(beforeByPath.get(entryPath)) !== JSON.stringify(afterByPath.get(entryPath)));
  const unexpected = changed.filter((entryPath) => {
    const prior = beforeByPath.get(entryPath);
    const next = afterByPath.get(entryPath);
    if (entryPath === "") return prior?.kind !== "directory" || next?.kind !== "directory";
    if (CODEX_MUTABLE_OPERATIONAL_FILES.has(entryPath)) {
      return prior?.kind !== "file" || next?.kind !== "file";
    }
    if (CODEX_TRANSIENT_OPERATIONAL_FILES.has(entryPath)) {
      return (prior !== undefined && prior.kind !== "file")
        || (next !== undefined && next.kind !== "file");
    }
    if (CODEX_MUTABLE_OPERATIONAL_DIRECTORIES.has(entryPath)) {
      return prior?.kind !== "directory" || next?.kind !== "directory";
    }
    return true;
  });
  if (unexpected.length === 0) return;
  throw new Error(
    `${label} changed non-operational provider state: ${describeFilesystemDifference(before, after)}`,
  );
}

function readClassicZipEntry(archive: Uint8Array, expectedPath: string): Uint8Array {
  const minimumEocd = 22;
  if (archive.byteLength < minimumEocd) throw new Error("cowork package is too short to be a ZIP archive");
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const firstCandidate = Math.max(0, archive.byteLength - minimumEocd - 65_535);
  let eocdOffset = -1;
  for (let offset = archive.byteLength - minimumEocd; offset >= firstCandidate; offset -= 1) {
    if (view.getUint32(offset, true) === 0x0605_4b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("cowork package has no classic ZIP directory");
  const entryCount = view.getUint16(eocdOffset + 10, true);
  let centralOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(centralOffset, true) !== 0x0201_4b50) {
      throw new Error("cowork package central directory is invalid");
    }
    const compression = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const uncompressedSize = view.getUint32(centralOffset + 24, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = decoder.decode(archive.subarray(centralOffset + 46, centralOffset + 46 + nameLength));
    if (name === expectedPath) {
      if (view.getUint32(localOffset, true) !== 0x0403_4b50) {
        throw new Error(`cowork package entry ${expectedPath} has no local header`);
      }
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = archive.subarray(dataOffset, dataOffset + compressedSize);
      const bytes = compression === 0
        ? new Uint8Array(compressed)
        : compression === 8
          ? new Uint8Array(inflateRawSync(compressed))
          : (() => { throw new Error(`cowork package entry ${expectedPath} uses unsupported compression`); })();
      if (bytes.byteLength !== uncompressedSize) {
        throw new Error(`cowork package entry ${expectedPath} has the wrong size`);
      }
      return bytes;
    }
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`cowork package is missing ${expectedPath}`);
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

function requireLifecycleResult(
  result: ProcessResult,
  operation: string,
  admittedKinds: readonly string[],
  label: string,
): Record<string, unknown> {
  const data = requireJsonData(result, label);
  const value = requireRecord(data.result, `${label} result`);
  if (data.operation !== operation || !admittedKinds.includes(String(value.kind))) {
    throw new Error(`${label} returned an unexpected lifecycle result: ${result.stdout.trim()}`);
  }
  return value;
}

function requireProviderOutcome(
  result: ProcessResult,
  operation: string,
  status: string,
  label: string,
): Record<string, unknown> {
  const data = requireJsonData(result, label);
  const providerResult = requireRecord(data.result, `${label} result`);
  const value = requireRecord(providerResult.value, `${label} result value`);
  if (data.operation !== operation || providerResult.ok !== true || value.status !== status) {
    throw new Error(`${label} returned an unexpected provider outcome: ${result.stdout.trim()}`);
  }
  return value;
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

async function requireCanonicalProviderExecutableFromEnvironment(): Promise<string> {
  const executable = process.env.RAWR_CODEX_EXECUTABLE;
  if (executable === undefined || !path.isAbsolute(executable)) {
    throw new Error(
      "installed lifecycle acceptance requires RAWR_CODEX_EXECUTABLE as an absolute canonical path",
    );
  }
  const canonical = await realpath(executable);
  if (canonical !== executable) {
    throw new Error("installed lifecycle acceptance requires a canonical Codex executable path");
  }
  const status = await lstat(canonical);
  if (!status.isFile()) {
    throw new Error("installed lifecycle acceptance requires a regular Codex executable file");
  }
  await access(canonical, constants.X_OK);
  return canonical;
}

async function snapshotExternalRegistry(dataRoot: string): Promise<readonly FilesystemReceipt[]> {
  const receipts: FilesystemReceipt[] = [];
  for (const name of ["package.json", "node_modules", "package-lock.json", "yarn.lock", "bun.lock"]) {
    await snapshotFilesystemEntry(dataRoot, path.join(dataRoot, name), receipts);
  }
  return receipts.sort((left, right) => left.path.localeCompare(right.path));
}

async function snapshotFilesystemTree(root: string): Promise<readonly FilesystemReceipt[]> {
  const receipts: FilesystemReceipt[] = [];
  await snapshotFilesystemEntry(root, root, receipts);
  return receipts.sort((left, right) => left.path.localeCompare(right.path));
}

async function snapshotFilesystemChildren(root: string): Promise<readonly FilesystemReceipt[]> {
  const receipts: FilesystemReceipt[] = [];
  for (const child of (await readdir(root)).sort()) {
    await snapshotFilesystemEntry(root, path.join(root, child), receipts);
  }
  return receipts.sort((left, right) => left.path.localeCompare(right.path));
}

async function requireCodexManagedIdentityAbsent(input: Readonly<{
  executable: string;
  home: string;
  contentAuthority: string;
  pluginId: string;
}>): Promise<void> {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: input.home,
    CODEX_HOME: input.home,
  };
  delete environment.CODEX_FORK_HOME;
  delete environment.CODEX_SWITCHBOARD_HOME;
  delete environment.CODEX_SWITCHBOARD_TARGET;
  const inventory = await runCaptured({
    executable: input.executable,
    args: ["plugin", "list", "--json"],
    cwd: input.home,
    env: environment,
  });
  requireSuccess(inventory, "Codex inventory while checking managed identity absence");
  const inventoryText = inventory.stdout;
  if (inventoryText.includes(input.contentAuthority) || inventoryText.includes(input.pluginId)) {
    throw new Error(`Codex inventory retained the managed lifecycle identity: ${inventoryText.trim()}`);
  }
  try {
    const config = await readFile(path.join(input.home, "config.toml"), "utf8");
    if (config.includes(input.contentAuthority) || config.includes(input.pluginId)) {
      throw new Error("Codex config retained the managed lifecycle identity");
    }
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  const authorityCache = path.join(input.home, "plugins", "cache", input.contentAuthority);
  try {
    if ((await readdir(authorityCache)).length !== 0) {
      throw new Error("Codex cache retained managed lifecycle members after undo");
    }
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  await requireMissing(path.join(input.home, "skills", "example"), "Codex managed skill");
}

async function requireCodexManagedIdentityPresent(input: Readonly<{
  executable: string;
  home: string;
  contentAuthority: string;
  pluginId: string;
}>): Promise<void> {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: input.home,
    CODEX_HOME: input.home,
  };
  delete environment.CODEX_FORK_HOME;
  delete environment.CODEX_SWITCHBOARD_HOME;
  delete environment.CODEX_SWITCHBOARD_TARGET;
  const inventory = await runCaptured({
    executable: input.executable,
    args: ["plugin", "list", "--json"],
    cwd: input.home,
    env: environment,
  });
  requireSuccess(inventory, "Codex inventory after installed lifecycle mutation");
  if (
    !inventory.stdout.includes(input.contentAuthority)
    || !inventory.stdout.includes(input.pluginId)
  ) {
    throw new Error(`Codex inventory omitted the managed lifecycle identity: ${inventory.stdout.trim()}`);
  }
  const config = await readFile(path.join(input.home, "config.toml"), "utf8");
  if (!config.includes(input.contentAuthority) || !config.includes(input.pluginId)) {
    throw new Error("Codex config omitted the managed lifecycle identity after mutation");
  }
  const inventoryRecord = requireRecord(
    JSON.parse(inventory.stdout) as unknown,
    "Codex inventory after installed lifecycle mutation",
  );
  const installed = inventoryRecord.installed;
  const managed = Array.isArray(installed)
    ? installed.map((entry) => requireRecord(entry, "Codex installed plugin")).filter((entry) =>
        entry.name === input.pluginId
        && entry.marketplaceName === input.contentAuthority
        && entry.installed === true
        && entry.enabled === true)
    : [];
  if (managed.length !== 1 || typeof managed[0]!.version !== "string") {
    throw new Error("Codex inventory did not contain one enabled managed lifecycle member");
  }
  const skillBytes = await readFile(path.join(
    input.home,
    "plugins",
    "cache",
    input.contentAuthority,
    input.pluginId,
    managed[0]!.version,
    "skills",
    "example",
    "SKILL.md",
  ));
  if (!Buffer.from(skillBytes).equals(Buffer.from(FIXTURE_SKILL_BYTES))) {
    throw new Error("Codex installed skill bytes do not match the managed release");
  }
}

async function snapshotFilesystemEntry(
  root: string,
  target: string,
  receipts: FilesystemReceipt[],
): Promise<void> {
  const relative = path.relative(root, target).split(path.sep).join("/");
  let status;
  try {
    status = await lstat(target);
  } catch (error) {
    if (isMissing(error)) {
      receipts.push({ path: relative, kind: "missing" });
      return;
    }
    throw error;
  }
  const common = {
    path: relative,
    mode: status.mode,
    size: status.size,
    mtimeMs: status.mtimeMs,
  } as const;
  if (status.isSymbolicLink()) {
    receipts.push({ ...common, kind: "symlink", link: await readlink(target) });
    return;
  }
  if (status.isDirectory()) {
    receipts.push({ ...common, kind: "directory" });
    const children = await readdir(target);
    for (const child of children.sort()) {
      await snapshotFilesystemEntry(root, path.join(target, child), receipts);
    }
    return;
  }
  if (!status.isFile()) throw new Error(`unsupported external registry entry: ${target}`);
  const digest = createHash("sha256").update(await readFile(target)).digest("hex");
  receipts.push({ ...common, kind: "file", digest });
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

function requireCreated<T>(
  result: Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; issues: readonly unknown[] }>,
  label: string,
): T {
  if (result.ok) return result.value;
  throw new Error(`${label} fixture construction failed: ${JSON.stringify(result.issues)}`);
}

async function writeLifecycleContentFixture(acceptanceRoot: string): Promise<LifecycleContentFixture> {
  const root = path.join(acceptanceRoot, "lifecycle-content");
  const releaseInputPath = ".rawr/release-input.json";
  const skillRelativePath = "skills/example/SKILL.md";
  const pluginId = "fixture-plugin";
  const repositoryIdentity = "git:fixture-agent-plugins";
  const contentAuthority = "fixture-authority";
  const payloadBytes = FIXTURE_SKILL_BYTES;
  const payload = requireCreated(createAgentPluginPayload([{
    path: skillRelativePath,
    mode: 0o644,
    bytes: payloadBytes,
  }]), "lifecycle payload");
  const releaseInput = requireCreated(createAgentPluginReleaseInput({
    schemaVersion: 1,
    contentAuthority,
    members: [{
      kind: "agent-plugin",
      pluginId,
      skillInventory: [{ identity: "example", manifestPath: skillRelativePath }],
      payload: {
        protocolVersion: 1,
        manifest: payload.manifest,
        payloadDigest: payload.payloadDigest,
      },
      vendor: [],
      curation: [],
    }],
    ownershipClaims: [{ kind: "skill", identity: "example", ownerPluginId: pluginId }],
    locks: [],
    qualityPolicies: [],
  }), "lifecycle release input");
  const skillPath = path.join(root, "plugins", "agent", pluginId, skillRelativePath);
  await Promise.all([
    mkdir(path.dirname(skillPath), { recursive: true }),
    mkdir(path.join(root, ".rawr"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(skillPath, payloadBytes),
    writeFile(
      path.join(root, releaseInputPath),
      canonicalSerializeAgentPluginReleaseInput(releaseInput),
    ),
  ]);
  const gitExecutable = await realpath("/usr/bin/git");
  for (const [args, label] of [
    [["init", "--quiet", "--initial-branch=main"], "lifecycle git init"],
    [["remote", "add", "origin", repositoryIdentity], "lifecycle git remote"],
    [["add", "--all"], "lifecycle git add"],
    [[
      "-c",
      "user.name=RAWR Lifecycle Acceptance",
      "-c",
      "user.email=lifecycle-acceptance@invalid.local",
      "commit",
      "--quiet",
      "-m",
      "test(lifecycle): create installed controller fixture",
    ], "lifecycle git commit"],
  ] as const) {
    requireSuccess(await runCaptured({ executable: gitExecutable, args, cwd: root }), label);
  }
  const readObject = async (revision: string, label: string): Promise<string> => {
    const result = await runCaptured({
      executable: gitExecutable,
      args: ["rev-parse", "--verify", revision],
      cwd: root,
    });
    requireSuccess(result, label);
    return result.stdout.trim();
  };
  return Object.freeze({
    root,
    repositoryIdentity,
    contentAuthority,
    refName: "refs/heads/main",
    sourceCommit: await readObject("HEAD^{commit}", "lifecycle commit identity"),
    sourceTree: await readObject("HEAD^{tree}", "lifecycle tree identity"),
    releaseInputPath,
    gitExecutable,
  });
}

async function requireInstalledLifecycleSchemaRealm(input: Readonly<{
  releaseRoot: string;
  environment: NodeJS.ProcessEnv;
  fixture: LifecycleContentFixture;
}>): Promise<void> {
  const appRoot = path.join(input.releaseRoot, "app");
  const typeboxManifest = requireRecord(
    JSON.parse(await readFile(path.join(appRoot, "node_modules", "typebox", "package.json"), "utf8")) as unknown,
    "installed TypeBox manifest",
  );
  if (typeboxManifest.version !== "1.3.6") {
    throw new Error(`installed lifecycle schema realm resolved TypeBox ${String(typeboxManifest.version)}`);
  }
  const validInput = {
    contentWorkspace: {
      locator: input.fixture.root,
      repositoryIdentity: input.fixture.repositoryIdentity,
      contentAuthority: input.fixture.contentAuthority,
      remoteName: "origin",
      remoteUrl: input.fixture.repositoryIdentity,
      refName: input.fixture.refName,
      sourceCommit: input.fixture.sourceCommit,
      sourceTree: input.fixture.sourceTree,
      releaseInputPath: input.fixture.releaseInputPath,
      pluginRoot: "plugins/agent",
    },
    mode: { kind: "complete-set" },
  } as const;
  const invalidInput = {
    ...validInput,
    contentWorkspace: {
      ...validInput.contentWorkspace,
      releaseInputPath: ".rawr/../release-input.json",
    },
  } as const;
  const schemaProbe = await runCaptured({
    executable: path.join(input.releaseRoot, "runtime", "bun"),
    args: [
      "--config=/dev/null",
      "--no-env-file",
      "--no-install",
      "-e",
      [
        'import { Value } from "./node_modules/typebox/build/value/index.mjs";',
        'import { CheckInputSchema } from "./node_modules/@rawr/agent-plugin-lifecycle/dist/service/modules/releases/schemas.js";',
        `const valid = ${JSON.stringify(validInput)};`,
        `const invalid = ${JSON.stringify(invalidInput)};`,
        'if (!Value.Check(CheckInputSchema, valid)) throw new Error("installed schema rejected the valid fixture");',
        'if (Value.Check(CheckInputSchema, invalid)) throw new Error("installed schema dropped Refine semantics");',
        'process.stdout.write("installed-schema-refine-ok\\n");',
      ].join("\n"),
    ],
    cwd: appRoot,
    env: scrubbedBunEnvironment({
      ...input.environment,
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    }),
  });
  requireSuccess(schemaProbe, "installed lifecycle schema realm");
  requireIncludes(schemaProbe.stdout, "installed-schema-refine-ok", "installed lifecycle schema realm");
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
  await requireCanonicalProviderExecutableFromEnvironment();
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
  const canonicalCodexExecutable = await requireCanonicalProviderExecutableFromEnvironment();
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
  const lifecycleContent = await writeLifecycleContentFixture(acceptanceRoot);
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
  await requireInstalledLifecycleSchemaRealm({
    releaseRoot: installed.release.releaseRoot,
    environment: hostile.env,
    fixture: lifecycleContent,
  });

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

  const externalRegistryBeforeLifecycle = await snapshotExternalRegistry(dataRoot);
  const lifecycleCommandIds = officialCommandIds.filter((id) => id.startsWith("agent:plugins:"));
  requireExactStrings(
    lifecycleCommandIds,
    EXPECTED_AGENT_PLUGIN_COMMAND_IDS,
    "installed qualified agent plugin command set",
  );
  requireExactStrings(
    officialCommandIds.filter((id) => id.startsWith("plugins:")),
    EXPECTED_EXTERNAL_PLUGIN_COMMAND_IDS,
    "installed external plugin command set",
  );
  const vendorStatusArgs = [
    "agent",
    "plugins",
    "vendors",
    "status",
    "--content-workspace",
    lifecycleContent.root,
    "--repository-identity",
    lifecycleContent.repositoryIdentity,
    "--content-authority",
    lifecycleContent.contentAuthority,
    "--ref",
    lifecycleContent.refName,
    "--source-commit",
    lifecycleContent.sourceCommit,
    "--source-tree",
    lifecycleContent.sourceTree,
    "--release-input",
    lifecycleContent.releaseInputPath,
    "--git-executable",
    lifecycleContent.gitExecutable,
    "--json",
  ] as const;
  const lifecycleContentBefore = await snapshotFilesystemTree(lifecycleContent.root);
  const controllerBeforeVendorStatus = await snapshotFilesystemTree(dataRoot);
  const vendorStatus = await invoke(vendorStatusArgs, "installed vendor status");
  requireSuccess(vendorStatus, "installed rawr agent plugins vendors status");
  const vendorStatusData = requireJsonData(vendorStatus, "installed vendor status");
  const vendorStatusResult = requireRecord(vendorStatusData.result, "installed vendor status result");
  if (
    vendorStatusData.operation !== "vendors.status"
    || vendorStatusResult.kind !== "VendorStatus"
    || !Array.isArray(vendorStatusResult.sources)
    || vendorStatusResult.sources.length !== 0
  ) {
    throw new Error(`installed vendor status returned the wrong result: ${vendorStatus.stdout.trim()}`);
  }
  const repeatedVendorStatus = await invoke(vendorStatusArgs, "repeated installed vendor status");
  requireSuccess(repeatedVendorStatus, "repeated installed rawr agent plugins vendors status");
  if (repeatedVendorStatus.stdout !== vendorStatus.stdout) {
    throw new Error("repeated installed vendor status changed its observable result");
  }
  const lifecycleContentAfter = await snapshotFilesystemTree(lifecycleContent.root);
  if (
    JSON.stringify(lifecycleContentAfter) !== JSON.stringify(lifecycleContentBefore)
    || JSON.stringify(await snapshotFilesystemTree(dataRoot))
      !== JSON.stringify(controllerBeforeVendorStatus)
  ) {
    throw new Error("installed vendor status changed content or controller state");
  }

  const buildArgs = [
    "agent",
    "plugins",
    "build",
    "--content-workspace",
    lifecycleContent.root,
    "--repository-identity",
    lifecycleContent.repositoryIdentity,
    "--content-authority",
    lifecycleContent.contentAuthority,
    "--remote-name",
    "origin",
    "--remote-url",
    lifecycleContent.repositoryIdentity,
    "--ref",
    lifecycleContent.refName,
    "--source-commit",
    lifecycleContent.sourceCommit,
    "--source-tree",
    lifecycleContent.sourceTree,
    "--release-input",
    lifecycleContent.releaseInputPath,
    "--plugin-root",
    "plugins/agent",
    "--plugin",
    "fixture-plugin",
    "--git-executable",
    lifecycleContent.gitExecutable,
    "--json",
  ] as const;
  const built = await invoke(buildArgs, "installed lifecycle build");
  requireSuccess(built, "installed rawr agent plugins build");
  const builtResult = requireLifecycleResult(
    built,
    "releases.build",
    ["Published"],
    "installed lifecycle build",
  );
  const builtRef = requireRecord(builtResult.ref, "installed lifecycle build ref");
  if (
    builtRef.kind !== "release"
    || typeof builtRef.releaseDigest !== "string"
    || typeof builtRef.artifactDigest !== "string"
  ) {
    throw new Error(`installed lifecycle build returned an invalid artifact ref: ${built.stdout.trim()}`);
  }
  const releaseHandle = `release:${builtRef.releaseDigest}:${builtRef.artifactDigest}`;
  if (JSON.stringify(await snapshotFilesystemTree(lifecycleContent.root)) !== JSON.stringify(lifecycleContentBefore)) {
    throw new Error("installed lifecycle build changed the content workspace");
  }
  const controllerAfterBuild = await snapshotFilesystemTree(dataRoot);
  const repeatedBuild = await invoke(buildArgs, "repeated installed lifecycle build");
  requireSuccess(repeatedBuild, "repeated installed rawr agent plugins build");
  requireLifecycleResult(
    repeatedBuild,
    "releases.build",
    ["ReadOnlyConverged"],
    "repeated installed lifecycle build",
  );
  if (
    JSON.stringify(await snapshotFilesystemTree(dataRoot)) !== JSON.stringify(controllerAfterBuild)
    || JSON.stringify(await snapshotFilesystemTree(lifecycleContent.root)) !== JSON.stringify(lifecycleContentBefore)
  ) {
    throw new Error("repeated installed lifecycle build changed controller data or content bytes");
  }

  const providerHome = path.join(acceptanceRoot, "codex-home");
  await mkdir(providerHome);
  await requireCodexManagedIdentityAbsent({
    executable: canonicalCodexExecutable,
    home: providerHome,
    contentAuthority: lifecycleContent.contentAuthority,
    pluginId: "fixture-plugin",
  });
  const providerTestArgs = [
    "agent",
    "plugins",
    "test",
    "--release",
    releaseHandle,
    "--evaluation-profile",
    "provider-smoke@v1",
    "--target",
    `codex=${providerHome}`,
    "--provider-executable",
    `codex=${canonicalCodexExecutable}`,
    "--json",
  ] as const;
  const testedProvider = await invoke(providerTestArgs, "installed lifecycle provider test");
  requireSuccess(testedProvider, "installed rawr agent plugins test");
  requireProviderOutcome(
    testedProvider,
    "providers.targetedTest",
    "Mutated",
    "installed lifecycle provider test",
  );
  await requireCodexManagedIdentityPresent({
    executable: canonicalCodexExecutable,
    home: providerHome,
    contentAuthority: lifecycleContent.contentAuthority,
    pluginId: "fixture-plugin",
  });
  const providerHomeAfterFirst = await snapshotFilesystemTree(providerHome);
  const controllerAfterProvider = await snapshotFilesystemTree(dataRoot);
  const repeatedProvider = await invoke(
    providerTestArgs,
    "repeated installed lifecycle provider test",
  );
  requireSuccess(repeatedProvider, "repeated installed rawr agent plugins test");
  requireProviderOutcome(
    repeatedProvider,
    "providers.targetedTest",
    "ReadOnlyConverged",
    "repeated installed lifecycle provider test",
  );
  const providerHomeAfterRepeat = await snapshotFilesystemTree(providerHome);
  const controllerAfterProviderRepeat = await snapshotFilesystemTree(dataRoot);
  requireOnlyCodexOperationalStateChanged(
    providerHomeAfterFirst,
    providerHomeAfterRepeat,
    "repeated installed provider test",
  );
  if (JSON.stringify(controllerAfterProviderRepeat) !== JSON.stringify(controllerAfterProvider)) {
    throw new Error(
      "repeated installed provider test changed controller state: "
      + describeFilesystemDifference(controllerAfterProvider, controllerAfterProviderRepeat),
    );
  }

  const unavailableContentRoot = `${lifecycleContent.root}.unavailable`;
  await rename(lifecycleContent.root, unavailableContentRoot);
  await requireMissing(lifecycleContent.root, "artifact-only lifecycle source locator");
  const unavailableContentBefore = await snapshotFilesystemTree(unavailableContentRoot);

  const packageRoot = path.join(acceptanceRoot, "package-output");
  const packageOutput = path.join(packageRoot, "fixture.cowork.zip");
  await mkdir(packageRoot);
  const packageArgs = [
    "agent",
    "plugins",
    "package",
    "--artifact",
    releaseHandle,
    "--format",
    "cowork-v1",
    "--output",
    packageOutput,
    "--json",
  ] as const;
  const packaged = await invoke(packageArgs, "installed lifecycle package");
  requireSuccess(packaged, "installed rawr agent plugins package");
  requireLifecycleResult(
    packaged,
    "packaging.package",
    ["OutputReplacedVerified"],
    "installed lifecycle package",
  );
  const packageStatus = await lstat(packageOutput);
  const packagedFixtureBytes = readClassicZipEntry(
    await readFile(packageOutput),
    "skills/example/SKILL.md",
  );
  if (
    !packageStatus.isFile()
    || !Buffer.from(packagedFixtureBytes).equals(Buffer.from(FIXTURE_SKILL_BYTES))
  ) {
    throw new Error("installed lifecycle package does not contain the admitted fixture bytes");
  }
  const packageAfterFirst = await snapshotFilesystemTree(packageRoot);
  const controllerAfterPackage = await snapshotFilesystemTree(dataRoot);
  const repeatedPackage = await invoke(packageArgs, "repeated installed lifecycle package");
  requireSuccess(repeatedPackage, "repeated installed rawr agent plugins package");
  requireLifecycleResult(
    repeatedPackage,
    "packaging.package",
    ["ReadOnlyConverged"],
    "repeated installed lifecycle package",
  );
  if (
    JSON.stringify(await snapshotFilesystemTree(packageRoot)) !== JSON.stringify(packageAfterFirst)
    || JSON.stringify(await snapshotFilesystemTree(dataRoot))
      !== JSON.stringify(controllerAfterPackage)
    || JSON.stringify(await snapshotFilesystemTree(unavailableContentRoot))
      !== JSON.stringify(unavailableContentBefore)
  ) {
    throw new Error("repeated installed lifecycle package changed owned or unavailable source state");
  }

  const exportRoot = path.join(acceptanceRoot, "export-destination");
  await mkdir(exportRoot);
  const exportBefore = await snapshotFilesystemChildren(exportRoot);
  const exportArgs = [
    "agent",
    "plugins",
    "export",
    "--artifact",
    releaseHandle,
    "--mode",
    "targeted-release",
    "--layout",
    "codex-v1",
    "--destination",
    exportRoot,
    "--overwrite",
    "managed-only",
    "--json",
  ] as const;
  const exported = await invoke(exportArgs, "installed lifecycle export");
  requireSuccess(exported, "installed rawr agent plugins export");
  requireLifecycleResult(
    exported,
    "exports.apply",
    ["MutatedSettled"],
    "installed lifecycle export",
  );
  const exportedSkillRelativePath = "codex/plugins/fixture-plugin/skills/example/SKILL.md";
  const exportedSkillBytes = await readFile(path.join(exportRoot, exportedSkillRelativePath));
  const exportLedger = requireRecord(
    JSON.parse(
      await readFile(path.join(exportRoot, ".rawr-agent-plugin-export-ledger-v1.json"), "utf8"),
    ) as unknown,
    "installed lifecycle export ledger",
  );
  const exportLedgerBody = requireRecord(exportLedger.body, "installed lifecycle export ledger body");
  const exportScopes = exportLedgerBody.scopes;
  const exportScope = Array.isArray(exportScopes) && exportScopes.length === 1
    ? requireRecord(exportScopes[0], "installed lifecycle export ledger scope")
    : null;
  const exportFileClaims = exportScope?.files;
  if (
    !Buffer.from(exportedSkillBytes).equals(Buffer.from(FIXTURE_SKILL_BYTES))
    || exportLedgerBody.canonicalDestination !== await realpath(exportRoot)
    || exportLedgerBody.layout !== "codex-v1"
    || exportLedgerBody.generation !== 1
    || exportScope?.pluginId !== "fixture-plugin"
    || exportScope?.releaseDigest !== builtRef.releaseDigest
    || !Array.isArray(exportFileClaims)
    || exportFileClaims.length !== 1
    || requireRecord(exportFileClaims[0], "installed lifecycle export ledger file claim").relativePath
      !== exportedSkillRelativePath
  ) {
    throw new Error("installed lifecycle export bytes and ownership ledger do not match the artifact");
  }
  const exportAfterFirst = await snapshotFilesystemTree(exportRoot);
  const controllerAfterExport = await snapshotFilesystemTree(dataRoot);
  const repeatedExport = await invoke(exportArgs, "repeated installed lifecycle export");
  requireSuccess(repeatedExport, "repeated installed rawr agent plugins export");
  requireLifecycleResult(
    repeatedExport,
    "exports.apply",
    ["ReadOnlyConverged"],
    "repeated installed lifecycle export",
  );
  if (
    JSON.stringify(await snapshotFilesystemTree(exportRoot)) !== JSON.stringify(exportAfterFirst)
    || JSON.stringify(await snapshotFilesystemTree(dataRoot)) !== JSON.stringify(controllerAfterExport)
    || JSON.stringify(await snapshotFilesystemTree(unavailableContentRoot))
      !== JSON.stringify(unavailableContentBefore)
  ) {
    throw new Error("repeated installed lifecycle export changed managed state");
  }
  const exportUndo = await invoke(
    ["agent", "plugins", "undo", "--json"],
    "installed export undo",
  );
  requireSuccess(exportUndo, "installed rawr agent plugins undo after export");
  const exportUndoData = requireJsonData(exportUndo, "installed export undo");
  const exportUndoResult = requireRecord(exportUndoData.result, "installed export undo result");
  const exportAfterUndo = await snapshotFilesystemChildren(exportRoot);
  const providerAfterExportUndo = await snapshotFilesystemTree(providerHome);
  const packageAfterExportUndo = await snapshotFilesystemTree(packageRoot);
  const sourceAfterExportUndo = await snapshotFilesystemTree(unavailableContentRoot);
  const registryAfterExportUndo = await snapshotExternalRegistry(dataRoot);
  if (
    exportUndoData.operation !== "controller.undo"
    || exportUndoResult.kind !== "RestoredAndCleared"
    || JSON.stringify(exportAfterUndo) !== JSON.stringify(exportBefore)
    || JSON.stringify(providerAfterExportUndo) !== JSON.stringify(providerHomeAfterRepeat)
    || JSON.stringify(packageAfterExportUndo) !== JSON.stringify(packageAfterFirst)
    || JSON.stringify(sourceAfterExportUndo) !== JSON.stringify(unavailableContentBefore)
    || JSON.stringify(registryAfterExportUndo) !== JSON.stringify(externalRegistryBeforeLifecycle)
  ) {
    throw new Error(
      "installed export undo did not restore only its destination: "
      + `result=${exportUndo.stdout.trim()}; `
      + `destination=${describeFilesystemDifference(exportBefore, exportAfterUndo)}; `
      + `provider=${describeFilesystemDifference(providerHomeAfterRepeat, providerAfterExportUndo)}; `
      + `package=${describeFilesystemDifference(packageAfterFirst, packageAfterExportUndo)}; `
      + `source=${describeFilesystemDifference(unavailableContentBefore, sourceAfterExportUndo)}; `
      + `registry=${describeFilesystemDifference(externalRegistryBeforeLifecycle, registryAfterExportUndo)}`,
    );
  }
  const controllerAfterExportUndo = await snapshotFilesystemTree(dataRoot);
  const repeatedExportUndo = await invoke(
    ["agent", "plugins", "undo", "--json"],
    "empty-capsule undo after export",
  );
  requireSuccess(repeatedExportUndo, "empty-capsule rawr agent plugins undo after export");
  const repeatedExportUndoData = requireJsonData(
    repeatedExportUndo,
    "empty-capsule undo after export",
  );
  const repeatedExportUndoResult = requireRecord(
    repeatedExportUndoData.result,
    "empty-capsule undo after export result",
  );
  if (
    repeatedExportUndoData.operation !== "controller.undo"
    || repeatedExportUndoResult.kind !== "NoCommittedCapsule"
    || JSON.stringify(await snapshotFilesystemTree(dataRoot))
      !== JSON.stringify(controllerAfterExportUndo)
    || JSON.stringify(await snapshotFilesystemChildren(exportRoot)) !== JSON.stringify(exportBefore)
    || JSON.stringify(await snapshotFilesystemTree(providerHome))
      !== JSON.stringify(providerHomeAfterRepeat)
    || JSON.stringify(await snapshotFilesystemTree(packageRoot)) !== JSON.stringify(packageAfterFirst)
    || JSON.stringify(await snapshotFilesystemTree(unavailableContentRoot))
      !== JSON.stringify(unavailableContentBefore)
  ) {
    throw new Error(`empty-capsule undo after export did not stutter: ${repeatedExportUndo.stdout.trim()}`);
  }
  const captureRefusalOwners = async (): Promise<string> => JSON.stringify({
    controller: await snapshotFilesystemTree(dataRoot),
    externalRegistry: await snapshotExternalRegistry(dataRoot),
    packageOutput: await snapshotFilesystemTree(packageRoot),
    exportDestination: await snapshotFilesystemTree(exportRoot),
    providerHome: await snapshotFilesystemTree(providerHome),
    unavailableContent: await snapshotFilesystemTree(unavailableContentRoot),
  });
  const invalidOutput = path.join(hostile.cwd, "invalid.cowork.zip");
  await requireMissing(invalidOutput, "invalid lifecycle package output");
  const beforeInvalidLifecycle = await captureRefusalOwners();
  const invalidLifecycle = await invoke(
    [
      "agent",
      "plugins",
      "package",
      "--artifact",
      "not-an-artifact",
      "--format",
      "cowork-v1",
      "--output",
      invalidOutput,
      "--json",
    ],
    "invalid qualified lifecycle input",
  );
  requireFailure(invalidLifecycle, "invalid qualified lifecycle input");
  await requireMissing(invalidOutput, "refused lifecycle package output");
  if (await captureRefusalOwners() !== beforeInvalidLifecycle) {
    throw new Error("invalid qualified lifecycle input changed an owned state boundary");
  }
  const ownersBeforeRetiredRefusals = await captureRefusalOwners();
  for (const retired of RETIRED_CURATED_COMMANDS) {
    const refusal = await invoke(retired.argv, retired.label);
    requireFailure(refusal, retired.label);
  }
  if (await captureRefusalOwners() !== ownersBeforeRetiredRefusals) {
    throw new Error("a retired curated command refusal changed an owned state boundary");
  }
  const externalRegistryAfterLifecycle = await snapshotExternalRegistry(dataRoot);
  if (JSON.stringify(externalRegistryAfterLifecycle) !== JSON.stringify(externalRegistryBeforeLifecycle)) {
    throw new Error("qualified agent plugin commands changed external Oclif registry state");
  }

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
      qualifiedLifecycleCommandCount: lifecycleCommandIds.length,
      externalRegistryUnchanged: true,
    },
    installedLifecycle: {
      schemaRealm: "typebox@1.3.6-refine-enforced",
      vendorsStatus: "repeated-read-only-converged",
      contentWorkspace: "unchanged-then-unavailable",
      build: "published-then-read-only-converged",
      provider: {
        transition: "mutated-then-read-only-converged",
        observedBoundary: "complete-disposable-provider-home",
        nativeOperationalState: {
          claim: "not-byte-idempotent-across-native-codex-inspection",
          mutableFiles: [...CODEX_MUTABLE_OPERATIONAL_FILES],
          transientFiles: [...CODEX_TRANSIENT_OPERATIONAL_FILES],
          mutableDirectories: [...CODEX_MUTABLE_OPERATIONAL_DIRECTORIES],
          exactOutsideThatSet: true,
        },
        sameIdReplacementAndOmission: {
          claim: "not-claimed-by-installed-black-box",
          reason: "this proof carries one immutable fixture release",
          delegatedProof: [
            "services/agent-plugin-lifecycle/test/modules/providers/core-state-machine.test.ts",
            "services/agent-plugin-lifecycle/test/modules/providers/native-adapters.test.ts",
          ],
        },
      },
      package: "published-then-read-only-converged",
      export: "mutated-settled-converged-restored-empty-capsule-stutter",
      retiredCuratedCommands: RETIRED_CURATED_COMMANDS.map(({ label }) => label),
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
