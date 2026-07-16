/* eslint-disable @nx/enforce-module-boundaries -- This inert proof composes the curated C2 owner roots directly. */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import type { BigIntStats, Dirent } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  opendir,
  readFile,
  realpath,
  readlink,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, posix, resolve } from "node:path";
import { promisify } from "node:util";

import {
  canonicalSerializeAgentPluginReleaseInput,
  createAgentPluginPayload,
  createAgentPluginReleaseInput,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
  type ArtifactRef,
  type ReleaseResult,
} from "@rawr/agent-plugin-release";
import {
  createAgentPluginBuildApplications,
  createFilesystemArtifactReader,
  createFilesystemArtifactStore,
  createGitContentWorkspaceSnapshotReader,
  type ArtifactReader as BuildArtifactReader,
  type ArtifactStoreRoot,
  type ContentWorkspacePolicy,
} from "@rawr/agent-plugin-build";
import {
  COWORK_PACKAGE_FORMAT,
  createNodeAtomicPackageOutput,
  createPackageAgentPluginApplication,
} from "@rawr/agent-plugin-packaging";
import {
  CODEX_EXPORT_LAYOUT_V1,
  EXPORT_APPLICATION_PROTOCOL_VERSION,
  createExportAgentPluginsApplication,
  createKnownNativeHomesSnapshot,
  parseExportOwnerAction,
  type ArtifactReader as ExportArtifactReader,
  type KnownNativeHomesReader,
  type UndoWriter,
} from "@rawr/agent-plugin-export";

import type { CapsuleRoot } from "../../apps/cli/src/lib/agent-plugins/layout";
import {
  CapsuleControllerWriterV1,
  CapsuleUndoControllerV1,
  createAgentPluginOwnerProtocolRegistryV1,
  createExportUndoWriterV1,
  openNodeCapsuleStateStoreV1,
  type CapsuleOpaqueSourceV1,
} from "../../apps/cli/src/lib/agent-plugins/undo/index";

const execFileAsync = promisify(execFile);
const GIT_EXECUTABLE = "/usr/bin/git";
const PROOF_ROOT_PREFIX = "rawr-agent-plugin-release-product-proof-";
const EXPORT_OWNER = "agent-plugin-export";

const READ_ONLY_GIT_COMMANDS = new Set([
  "cat-file",
  "hash-object",
  "ls-files",
  "ls-tree",
  "remote",
  "rev-parse",
  "status",
  "symbolic-ref",
]);

interface OwnedProofRoot {
  readonly path: string;
  readonly parent: string;
  readonly parentDev: bigint;
  readonly parentIno: bigint;
  readonly dev: bigint;
  readonly ino: bigint;
}

interface GeneratedContentWorkspace {
  readonly policy: ContentWorkspacePolicy;
  readonly sourceSnapshot: readonly TreeSnapshotEntry[];
}

interface TreeSnapshotEntry {
  readonly path: string;
  readonly kind: "directory" | "file" | "symlink";
  readonly dev: string;
  readonly ino: string;
  readonly mode: string;
  readonly nlink: string;
  readonly size: string;
  readonly mtimeNs: string;
  readonly ctimeNs: string;
  readonly digest?: string;
  readonly target?: string;
}

interface ProofEvidence {
  readonly releaseSetRef: ArtifactRef;
  readonly packageDigest: string;
  readonly firstBuild: string;
  readonly repeatedBuild: string;
  readonly firstPackage: string;
  readonly repeatedPackage: string;
  readonly firstExport: string;
  readonly repeatedExport: string;
  readonly capsuleOwner: string;
  readonly capsuleTargets: number;
  readonly capsuleActions: number;
  readonly undoResult: string;
  readonly restoredDestinations: number;
  readonly readOnlyGitCommands: number;
  readonly knownNativeHomeSnapshotReads: number;
  readonly capsuleAdmissions: number;
  readonly forbiddenMutationPortCalls: number;
  readonly convergedTreeWrites: number;
}

const evidence = await runProof();
console.log(`agent plugin release product integration proof: ${JSON.stringify(evidence)}`);

async function runProof(): Promise<ProofEvidence> {
  const ownedRoot = await createOwnedProofRoot();
  let proofError: unknown;
  try {
    return await executeProof(ownedRoot);
  } catch (error) {
    proofError = error;
    throw error;
  } finally {
    try {
      await removeOwnedProofRoot(ownedRoot);
    } catch (cleanupError) {
      if (proofError !== undefined) {
        throw new AggregateError([proofError, cleanupError], "proof and guarded cleanup both failed");
      }
      throw cleanupError;
    }
  }
}

async function executeProof(ownedRoot: OwnedProofRoot): Promise<ProofEvidence> {
  const forbiddenPorts = createForbiddenMutationPortTrap();
  const commandAudit = new CommandAudit();
  const content = await createGeneratedContentWorkspace(ownedRoot.path, commandAudit);
  const auditedGitExecutable = await commandAudit.enterReadOnlyPhase(ownedRoot.path);

  const externalCanariesRoot = join(ownedRoot.path, "external-port-canaries");
  const providerHome = await createExternalPortCanaries(externalCanariesRoot);
  const externalCanariesBefore = await snapshotTree(externalCanariesRoot);

  const artifactStoreRoot = join(
    ownedRoot.path,
    "controller-state",
    "artifacts-v1",
  ) as ArtifactStoreRoot;
  const source = await createGitContentWorkspaceSnapshotReader({
    gitExecutable: auditedGitExecutable,
    pathEnvironment: "/usr/bin:/bin",
  });
  const artifacts = createFilesystemArtifactStore({ artifactStoreRoot });
  const build = createAgentPluginBuildApplications(closedDependencyPorts(
    "build",
    { source, artifacts },
    forbiddenPorts,
  ));

  const buildRequest = Object.freeze({
    contentWorkspace: content.policy,
    mode: Object.freeze({ kind: "complete-set" as const }),
  });
  const checked = await build.check(buildRequest);
  assert(
    checked.kind === "EligibleReport",
    checked.kind === "IneligibleReport"
      ? `generated locator was not eligible: ${JSON.stringify(checked.issues)}`
      : `generated locator was not eligible: ${checked.kind}`,
  );
  const firstBuild = await build.build(buildRequest);
  assert(firstBuild.kind === "Published", `first complete-set build did not publish: ${firstBuild.kind}`);
  assert(firstBuild.ref.kind === "complete-set", "complete-set build returned a non-set ref");
  const releaseSetRef = firstBuild.ref;

  const buildReader = createFilesystemArtifactReader(artifactStoreRoot);
  const verified = await buildReader.read(releaseSetRef);
  assert(verified.kind === "Verified" && verified.snapshot.kind === "complete-set", "published set was not independently verified");

  const packageOutputRoot = join(ownedRoot.path, "package-output");
  await mkdir(packageOutputRoot, { mode: 0o700 });
  const packageOutputPath = join(packageOutputRoot, "complete-set.cowork.zip");
  const packageOperationIds = operationIds("package-proof");
  const packaging = createPackageAgentPluginApplication(closedDependencyPorts(
    "packaging",
    {
      artifactReader: buildReader,
      output: createNodeAtomicPackageOutput({ operationId: packageOperationIds }),
    },
    forbiddenPorts,
  ));
  const packageRequest = Object.freeze({
    artifactRef: releaseSetRef,
    format: COWORK_PACKAGE_FORMAT,
    outputPath: packageOutputPath,
  });
  const firstPackage = await packaging.package(packageRequest);
  assert(
    firstPackage.kind === "OutputReplacedVerified",
    `first package did not settle: ${JSON.stringify(firstPackage)}`,
  );
  const packageDigest = firstPackage.packageDigest;

  const exportDestinations = Object.freeze([
    join(ownedRoot.path, "explicit-export-destination-b"),
    join(ownedRoot.path, "explicit-export-destination-a"),
  ]);
  for (const destination of exportDestinations) await mkdir(destination, { mode: 0o700 });
  const exportPrior = await Promise.all(exportDestinations.map((destination) => snapshotTree(destination)));
  const controllerStateParent = join(ownedRoot.path, "controller-state");
  const capsuleRoot = join(controllerStateParent, "last-operation-v1") as CapsuleRoot;
  const registry = createAgentPluginOwnerProtocolRegistryV1();
  const opened = await openNodeCapsuleStateStoreV1({ root: capsuleRoot, registry });
  assert(opened.kind === "Opened", `controller capsule store did not open: ${opened.kind}`);
  const capsuleWriter = new CapsuleControllerWriterV1({
    store: opened.store,
    registry,
    opaqueSource: deterministicOpaqueSource(),
  });
  const undoAdapter = createCountingUndoWriter(createExportUndoWriterV1(capsuleWriter));
  const nativeHomes = createCountingNativeHomesReader(providerHome);
  const exportArtifactReader = adaptExportArtifactReader(buildReader);
  const exportApplication = createExportAgentPluginsApplication(closedDependencyPorts(
    "export",
    {
      artifactReader: exportArtifactReader,
      knownNativeHomesReader: nativeHomes.reader,
      undoWriter: undoAdapter.writer,
      operationId: operationIds("export-proof"),
      failpoints: undefined,
    },
    forbiddenPorts,
  ));
  const exportRequest = Object.freeze({
    protocolVersion: EXPORT_APPLICATION_PROTOCOL_VERSION,
    artifactRef: releaseSetRef,
    mode: "complete-set" as const,
    layout: CODEX_EXPORT_LAYOUT_V1,
    destinations: exportDestinations,
    overwritePolicy: "managed-only" as const,
  });
  const firstExport = await exportApplication.execute(exportRequest);
  assert(
    firstExport.kind === "MutatedSettled",
    `first explicit export did not settle: ${JSON.stringify(firstExport)}`,
  );
  assert(undoAdapter.beginCalls() === 1, "multi-destination export opened more than one capsule admission");

  const capsuleObservation = await opened.store.read();
  assert(capsuleObservation.kind === "Observed", `capsule state could not be read: ${capsuleObservation.kind}`);
  const capsuleState = capsuleObservation.observation.state.body.state;
  assert(capsuleState.kind === "idle" && capsuleState.committed !== null, "settled export did not leave one committed capsule");
  assert(capsuleState.committed.capsule.owner === EXPORT_OWNER, "capsule owner differs from export owner");
  assert(capsuleState.committed.capsule.targets.length === exportDestinations.length, "settled export capsule did not bind both destinations");
  assert(capsuleState.committed.capsule.actions.length > exportDestinations.length, "settled export capsule did not contain the aggregate action sequence");
  const expectedCapsuleTargets = [...exportDestinations].sort();
  assert(
    JSON.stringify(capsuleState.committed.capsule.targets.map(({ canonicalTarget }) => canonicalTarget))
      === JSON.stringify(expectedCapsuleTargets),
    "settled export capsule targets were not the exact canonically ordered destination set",
  );
  assert(
    JSON.stringify([...new Set(capsuleState.committed.capsule.actions.map(({ action }) =>
      parseExportOwnerAction(action).canonicalDestination))].sort()) === JSON.stringify(expectedCapsuleTargets),
    "settled export capsule actions did not exhaust the destination set",
  );

  const artifactBefore = await snapshotTree(artifactStoreRoot);
  const packageBefore = await snapshotTree(packageOutputRoot);
  const exportBefore = await Promise.all(exportDestinations.map((destination) => snapshotTree(destination)));
  const capsuleBefore = await snapshotTree(capsuleRoot);

  const repeatedBuild = await build.build(buildRequest);
  assert(repeatedBuild.kind === "ReadOnlyConverged", `repeated build was not read-only: ${repeatedBuild.kind}`);
  const repeatedPackage = await packaging.package(packageRequest);
  assert(repeatedPackage.kind === "ReadOnlyConverged", `repeated package was not read-only: ${repeatedPackage.kind}`);
  assert(repeatedPackage.packageDigest === packageDigest, "repeated package digest changed");
  const admissionsBeforeRepeat = undoAdapter.beginCalls();
  const repeatedExport = await exportApplication.execute(exportRequest);
  assert(repeatedExport.kind === "ReadOnlyConverged", `repeated export was not read-only: ${repeatedExport.kind}`);
  assert(undoAdapter.beginCalls() === admissionsBeforeRepeat, "converged export reopened capsule mutation admission");

  assertTreesEqual(artifactBefore, await snapshotTree(artifactStoreRoot), "artifact CAS changed during convergence");
  assertTreesEqual(packageBefore, await snapshotTree(packageOutputRoot), "package output changed during convergence");
  for (const [index, destination] of exportDestinations.entries()) {
    assertTreesEqual(exportBefore[index]!, await snapshotTree(destination), "export destination changed during convergence");
  }
  assertTreesEqual(capsuleBefore, await snapshotTree(capsuleRoot), "controller capsule changed during convergence");

  const coldRegistry = createAgentPluginOwnerProtocolRegistryV1();
  const coldOpened = await openNodeCapsuleStateStoreV1({ root: capsuleRoot, registry: coldRegistry });
  assert(coldOpened.kind === "Opened", `cold capsule store did not reopen: ${coldOpened.kind}`);
  const undo = new CapsuleUndoControllerV1({ store: coldOpened.store, registry: coldRegistry });
  const undoResult = await undo.undo();
  assert(undoResult.kind === "RestoredAndCleared", `cold aggregate undo did not restore and clear: ${undoResult.kind}`);
  for (const [index, destination] of exportDestinations.entries()) {
    assertTreesEqual(exportPrior[index]!, await snapshotTree(destination), "cold aggregate undo did not restore destination prior state");
  }
  const clearedObservation = await coldOpened.store.read();
  assert(clearedObservation.kind === "Observed", `cleared capsule could not be read: ${clearedObservation.kind}`);
  const clearedState = clearedObservation.observation.state.body.state;
  assert(clearedState.kind === "idle" && clearedState.committed === null, "cold aggregate undo did not clear the committed capsule");

  assertTreesEqual(artifactBefore, await snapshotTree(artifactStoreRoot), "artifact CAS changed during undo");
  assertTreesEqual(packageBefore, await snapshotTree(packageOutputRoot), "package output changed during undo");
  assertTreesEqual(content.sourceSnapshot, await snapshotTree(content.policy.locator), "content locator was mutated");
  assertTreesEqual(externalCanariesBefore, await snapshotTree(externalCanariesRoot), "an external mutation port canary changed");
  await commandAudit.settleReadOnlyPhase(content.policy.locator);
  assert(commandAudit.mutationCalls === 0, "a command mutation escaped the read-only Git runner");
  assert(forbiddenPorts.calls() === 0, "a forbidden external mutation port was requested");

  return Object.freeze({
    releaseSetRef,
    packageDigest,
    firstBuild: firstBuild.kind,
    repeatedBuild: repeatedBuild.kind,
    firstPackage: firstPackage.kind,
    repeatedPackage: repeatedPackage.kind,
    firstExport: firstExport.kind,
    repeatedExport: repeatedExport.kind,
    capsuleOwner: capsuleState.committed.capsule.owner,
    capsuleTargets: capsuleState.committed.capsule.targets.length,
    capsuleActions: capsuleState.committed.capsule.actions.length,
    undoResult: undoResult.kind,
    restoredDestinations: exportDestinations.length,
    readOnlyGitCommands: commandAudit.readOnlyCalls,
    knownNativeHomeSnapshotReads: nativeHomes.reads(),
    capsuleAdmissions: undoAdapter.beginCalls(),
    forbiddenMutationPortCalls: forbiddenPorts.calls(),
    convergedTreeWrites: 0,
  });
}

async function createGeneratedContentWorkspace(
  proofRoot: string,
  commandAudit: CommandAudit,
): Promise<GeneratedContentWorkspace> {
  const root = join(proofRoot, "generated-content-locator");
  await mkdir(root, { mode: 0o700 });
  const rawrDirectory = join(root, ".rawr");
  const pluginsDirectory = join(root, "plugins");
  const agentDirectory = join(pluginsDirectory, "agent");
  const memberDirectory = join(agentDirectory, "integration-proof");
  const skillsDirectory = join(memberDirectory, "skills");
  const skillDirectory = join(skillsDirectory, "integration-proof");
  for (const directory of [rawrDirectory, pluginsDirectory, agentDirectory, memberDirectory, skillsDirectory, skillDirectory]) {
    await mkdir(directory, { mode: 0o700 });
  }

  const pluginId = must(parsePluginId("integration-proof"));
  const contentAuthority = must(parseContentAuthority("generated-content-proof"));
  const repositoryIdentity = must(parseRepositoryIdentity("git:generated-agent-plugin-proof"));
  const releaseInputPath = must(parseReleaseRelativePath(".rawr/release-input.json"));
  const pluginRoot = must(parseReleaseRelativePath("plugins/agent"));
  const payloadPath = must(parseReleaseRelativePath("skills/integration-proof/SKILL.md"));
  const payloadBytes = new TextEncoder().encode("# Generated integration proof\n");
  const payload = must(createAgentPluginPayload([{ path: payloadPath, mode: 0o644, bytes: payloadBytes }]));
  const releaseInput = must(createAgentPluginReleaseInput({
    schemaVersion: 1,
    contentAuthority,
    members: [{
      kind: "agent-plugin",
      pluginId,
      skillInventory: [{ identity: "integration-proof", manifestPath: payloadPath }],
      payload: {
        protocolVersion: payload.protocolVersion,
        manifest: payload.manifest,
        payloadDigest: payload.payloadDigest,
      },
      vendor: [],
      curation: [],
    }],
    ownershipClaims: [{ kind: "skill", identity: "integration-proof", ownerPluginId: pluginId }],
    locks: [],
    qualityPolicies: [],
  }));
  await writeFile(join(rawrDirectory, "release-input.json"), canonicalSerializeAgentPluginReleaseInput(releaseInput), { mode: 0o644 });
  await writeFile(join(skillDirectory, "SKILL.md"), payloadBytes, { mode: 0o644 });

  await commandAudit.git(root, ["init", "-b", "main"]);
  await commandAudit.git(root, ["config", "user.email", "integration-proof@example.invalid"]);
  await commandAudit.git(root, ["config", "user.name", "Generated Integration Proof"]);
  await commandAudit.git(root, ["config", "core.ignorecase", "false"]);
  const remoteUrl = "https://example.invalid/generated-agent-plugin-proof.git";
  await commandAudit.git(root, ["remote", "add", "origin", remoteUrl]);
  await commandAudit.git(root, ["add", "--all"]);
  await commandAudit.git(root, ["commit", "-m", "generated proof fixture"]);
  const sourceCommit = must(parseGitCommitId(await commandAudit.git(root, ["rev-parse", "HEAD"])));
  const sourceTree = must(parseGitTreeId(await commandAudit.git(root, ["rev-parse", "HEAD^{tree}"])));
  const policy = Object.freeze({
    locator: root,
    repositoryIdentity,
    contentAuthority,
    remoteName: "origin",
    remoteUrl,
    refName: "refs/heads/main",
    sourceCommit,
    sourceTree,
    releaseInputPath,
    pluginRoot,
  });
  return Object.freeze({ policy, sourceSnapshot: await snapshotTree(root) });
}

class CommandAudit {
  #readOnly = false;
  #auditLog: string | undefined;
  #settled = false;
  readOnlyCalls = 0;
  mutationCalls = 0;

  async enterReadOnlyPhase(proofRoot: string): Promise<string> {
    this.#readOnly = true;
    const executable = join(proofRoot, "audited-read-only-git");
    const auditLog = join(proofRoot, "audited-read-only-git.log");
    await writeFile(auditLog, "", { mode: 0o600 });
    await writeFile(executable, [
      "#!/bin/sh",
      "set -eu",
      "{",
      "  printf '%s\\n' 'BEGIN'",
      "  printf 'CWD:%s\\n' \"$PWD\"",
      "  for argument in \"$@\"; do",
      "    printf 'ARG:%s\\n' \"$argument\"",
      "  done",
      "  printf '%s\\n' 'END'",
      `} >> ${shellQuote(auditLog)}`,
      `exec ${shellQuote(GIT_EXECUTABLE)} \"$@\"`,
      "",
    ].join("\n"), { mode: 0o700 });
    this.#auditLog = auditLog;
    return executable;
  }

  async git(cwd: string, args: readonly string[]): Promise<string> {
    if (this.#readOnly) {
      this.mutationCalls += 1;
      throw new Error("direct Git execution bypassed the closed content-workspace reader factory");
    }
    const result = await execFileAsync(GIT_EXECUTABLE, ["--no-optional-locks", ...args], {
      cwd,
      encoding: "utf8",
      env: gitEnvironment(),
      maxBuffer: 16 * 1024 * 1024,
    });
    return result.stdout.trim();
  }

  async settleReadOnlyPhase(expectedRoot: string): Promise<void> {
    assert(this.#auditLog !== undefined, "read-only Git audit was not initialized");
    assert(!this.#settled, "read-only Git audit was already settled");
    const records = parseGitAuditLog(await readFile(this.#auditLog, "utf8"));
    assert(records.length > 0, "closed content-workspace reader executed no observable Git commands");
    for (const record of records) this.admitReadOnlyGit(record.cwd, record.args, expectedRoot);
    this.#settled = true;
  }

  admitReadOnlyGit(cwd: string, args: readonly string[], expectedRoot: string): void {
    const invocation = stripGitRunnerPrefix(args);
    const commandOffset = invocation[0] === "--literal-pathspecs" ? 1 : 0;
    const command = invocation[commandOffset];
    const commandArgs = invocation.slice(commandOffset + 1);
    const mutation = cwd !== expectedRoot
      || command === undefined
      || !READ_ONLY_GIT_COMMANDS.has(command)
      || (command === "hash-object" && commandArgs.some((argument) => argument === "-w" || argument === "--write"))
      || (command === "remote" && commandArgs[0] !== "get-url")
      || (command === "symbolic-ref"
        && JSON.stringify(commandArgs) !== JSON.stringify(["--quiet", "HEAD"]))
      || invocation.some((argument) => argument.includes("plugin-sync"));
    if (mutation) {
      this.mutationCalls += 1;
      throw new Error(`command mutation port rejected: ${JSON.stringify(invocation)}`);
    }
    this.readOnlyCalls += 1;
  }
}

function stripGitRunnerPrefix(args: readonly string[]): readonly string[] {
  const expectedPrefix = [
    "--no-optional-locks",
    "-c",
    "core.fsmonitor=false",
    "-c",
    "core.untrackedCache=false",
  ];
  const prefixMatches = expectedPrefix.every((value, index) => args[index] === value);
  return prefixMatches ? args.slice(expectedPrefix.length) : [];
}

function parseGitAuditLog(source: string): readonly Readonly<{ cwd: string; args: readonly string[] }>[] {
  const records: Array<Readonly<{ cwd: string; args: readonly string[] }>> = [];
  let current: { cwd?: string; args: string[] } | undefined;
  for (const line of source.split("\n")) {
    if (line === "") continue;
    if (line === "BEGIN") {
      assert(current === undefined, "Git audit invocation records overlapped");
      current = { args: [] };
    } else if (line.startsWith("CWD:")) {
      assert(current !== undefined && current.cwd === undefined, "Git audit cwd record was misplaced");
      current.cwd = line.slice("CWD:".length);
    } else if (line.startsWith("ARG:")) {
      assert(current !== undefined, "Git audit argument appeared outside an invocation");
      current.args.push(line.slice("ARG:".length));
    } else if (line === "END") {
      assert(current?.cwd !== undefined, "Git audit invocation lacked a cwd");
      records.push(Object.freeze({ cwd: current.cwd, args: Object.freeze(current.args) }));
      current = undefined;
    } else {
      throw new Error(`Git audit contains an unknown record: ${line}`);
    }
  }
  assert(current === undefined, "Git audit ended during an invocation");
  return Object.freeze(records);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function gitEnvironment(): NodeJS.ProcessEnv {
  return {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_AUTHOR_DATE: "2000-01-01T00:00:00Z",
    GIT_COMMITTER_DATE: "2000-01-01T00:00:00Z",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
}

async function createExternalPortCanaries(root: string): Promise<string> {
  await mkdir(root, { mode: 0o700 });
  const names = [
    "acceptance-records",
    "agent-channels",
    "command-runtime",
    "legacy-sync-surface",
    "oclif-extension-registry",
    "personal-lifecycle-records",
    "provider-homes",
    "protected-lane-state",
  ];
  for (const name of names) {
    const directory = join(root, name);
    await mkdir(directory, { mode: 0o700 });
    await writeFile(join(directory, "mutation-canary.txt"), `${name}:unchanged\n`, { mode: 0o600 });
  }
  return join(root, "provider-homes");
}

function createCountingNativeHomesReader(providerHome: string): Readonly<{
  reader: KnownNativeHomesReader;
  reads(): number;
}> {
  const created = createKnownNativeHomesSnapshot([{ provider: "codex", canonicalPath: providerHome }]);
  assert(created.ok, "generated known-native-home snapshot was invalid");
  let reads = 0;
  return Object.freeze({
    reader: Object.freeze({
      async readCompleteSnapshot() {
        reads += 1;
        return Object.freeze({ kind: "Verified" as const, snapshot: created.snapshot });
      },
    }),
    reads: () => reads,
  });
}

function adaptExportArtifactReader(reader: BuildArtifactReader): ExportArtifactReader {
  const adapter: ExportArtifactReader = {
    async read(ref) {
      const result = await reader.read(ref);
      if (result.kind !== "Mismatch") return result;
      return Object.freeze({
        kind: "Mismatch" as const,
        ref: result.ref,
        issues: result.issues.map((issue) => Object.freeze({
          code: issue.code,
          path: "artifact-store",
          message: issue.detail,
        })) as [Readonly<{ code: string; path: string; message: string }>, ...Readonly<{ code: string; path: string; message: string }>[]],
      });
    },
  };
  return Object.freeze(adapter);
}

function createCountingUndoWriter(writer: UndoWriter): Readonly<{
  writer: UndoWriter;
  beginCalls(): number;
}> {
  let admissions = 0;
  const counted: UndoWriter = {
    ...writer,
    async begin(input) {
      admissions += 1;
      return await writer.begin(input);
    },
  };
  return Object.freeze({ writer: Object.freeze(counted), beginCalls: () => admissions });
}

function deterministicOpaqueSource(): CapsuleOpaqueSourceV1 {
  let next = 0;
  return Object.freeze({
    nextBytes() {
      next += 1;
      return new Uint8Array(32).fill(next & 0xff);
    },
  });
}

function createForbiddenMutationPortTrap(): Readonly<{ calls(): number; reject(owner: string, port: PropertyKey): never }> {
  let calls = 0;
  return Object.freeze({
    calls: () => calls,
    reject(owner, port): never {
      calls += 1;
      throw new Error(`${owner} requested forbidden external mutation port ${String(port)}`);
    },
  });
}

function closedDependencyPorts<T extends object>(
  owner: string,
  dependencies: T,
  trap: Readonly<{ reject(owner: string, port: PropertyKey): never }>,
): T {
  return new Proxy(Object.freeze(dependencies), {
    get(target, property, receiver) {
      if (!Object.hasOwn(target, property)) return trap.reject(owner, property);
      return Reflect.get(target, property, receiver);
    },
  });
}

function operationIds(prefix: string): () => string {
  let next = 0;
  return () => `${prefix}-${String(++next).padStart(8, "0")}`;
}

function isCanonicalAbsolutePath(value: string): boolean {
  return isAbsolute(value) && value === resolve(value) && value !== "/";
}

function assertTreesEqual(
  expected: readonly TreeSnapshotEntry[],
  actual: readonly TreeSnapshotEntry[],
  message: string,
): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message);
}

async function snapshotTree(root: string): Promise<readonly TreeSnapshotEntry[]> {
  const canonicalRoot = await realpath(root);
  assert(canonicalRoot === resolve(root), `snapshot root is not canonical: ${root}`);
  const result: TreeSnapshotEntry[] = [];
  await snapshotDirectory(canonicalRoot, "", result);
  return Object.freeze(result.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

async function snapshotDirectory(
  root: string,
  parent: string,
  result: TreeSnapshotEntry[],
): Promise<void> {
  const directoryPath = parent === "" ? root : join(root, ...parent.split("/"));
  const directory = await opendir(directoryPath);
  for await (const entry of directory) {
    const relativePath = parent === "" ? entry.name : posix.join(parent, entry.name);
    const path = join(root, ...relativePath.split("/"));
    const status = await lstat(path, { bigint: true });
    const identity = {
      path: relativePath,
      dev: status.dev.toString(10),
      ino: status.ino.toString(10),
      mode: status.mode.toString(8),
      nlink: status.nlink.toString(10),
      size: status.size.toString(10),
      mtimeNs: status.mtimeNs.toString(10),
      ctimeNs: status.ctimeNs.toString(10),
    };
    if (status.isDirectory() && !status.isSymbolicLink()) {
      result.push({ ...identity, kind: "directory" });
      await snapshotDirectory(root, relativePath, result);
    } else if (status.isFile()) {
      const bytes = await readFile(path);
      result.push({ ...identity, kind: "file", digest: createHash("sha256").update(bytes).digest("hex") });
    } else if (status.isSymbolicLink()) {
      result.push({ ...identity, kind: "symlink", target: await readlink(path) });
    } else {
      throw new Error(`snapshot refuses unsupported entry: ${path}`);
    }
  }
}

async function createOwnedProofRoot(): Promise<OwnedProofRoot> {
  const parent = await realpath(tmpdir());
  const parentStatus = await lstat(parent, { bigint: true });
  assert(parentStatus.isDirectory() && !parentStatus.isSymbolicLink(), "temporary parent is not a canonical directory");
  const path = await mkdtemp(join(parent, PROOF_ROOT_PREFIX));
  const first = await lstat(path, { bigint: true });
  const canonical = await realpath(path);
  const second = await lstat(path, { bigint: true });
  assert(
    canonical === path
      && dirname(path) === parent
      && basename(path).startsWith(PROOF_ROOT_PREFIX)
      && first.isDirectory()
      && !first.isSymbolicLink()
      && first.dev === second.dev
      && first.ino === second.ino,
    "created proof root failed its private-root identity guard",
  );
  return Object.freeze({
    path,
    parent,
    parentDev: parentStatus.dev,
    parentIno: parentStatus.ino,
    dev: first.dev,
    ino: first.ino,
  });
}

async function removeOwnedProofRoot(root: OwnedProofRoot): Promise<void> {
  await assertOwnedParent(root);
  await assertOwnedRoot(root);
  await removeOwnedDirectoryContents(root.path, root.dev, root.ino);
  await assertOwnedParent(root);
  await assertOwnedEmptyRoot(root);
  await rmdir(root.path);
}

async function removeOwnedDirectoryContents(
  directoryPath: string,
  expectedDev: bigint,
  expectedIno: bigint,
): Promise<void> {
  await assertCleanupDirectoryIdentity(directoryPath, expectedDev, expectedIno);
  const entries: string[] = [];
  const directory = await opendir(directoryPath);
  for await (const entry of directory) entries.push(entry.name);
  await assertCleanupDirectoryIdentity(directoryPath, expectedDev, expectedIno);
  entries.sort();
  for (const name of entries) {
    await assertCleanupDirectoryIdentity(directoryPath, expectedDev, expectedIno);
    assert(name !== "" && name !== "." && name !== ".." && !name.includes("/"), "cleanup encountered an unsafe entry name");
    const path = join(directoryPath, name);
    assert(dirname(path) === directoryPath, "cleanup candidate is not a direct child");
    const captured = await lstat(path, { bigint: true });
    if (captured.isDirectory() && !captured.isSymbolicLink()) {
      await assertCleanupDirectoryIdentity(path, captured.dev, captured.ino);
      await removeOwnedDirectoryContents(path, captured.dev, captured.ino);
      await assertCleanupDirectoryIdentity(directoryPath, expectedDev, expectedIno);
      await assertCleanupEmptyDirectory(path, captured);
      await rmdir(path);
    } else if (captured.isFile() && !captured.isSymbolicLink()) {
      await assertCleanupDirectoryIdentity(directoryPath, expectedDev, expectedIno);
      await assertCleanupFileIdentity(path, captured);
      await unlink(path);
    } else {
      throw new Error(`cleanup refuses unsupported entry: ${path}`);
    }
  }
}

async function assertCleanupDirectoryIdentity(
  path: string,
  expectedDev: bigint,
  expectedIno: bigint,
): Promise<void> {
  const first = await lstat(path, { bigint: true });
  const firstCanonical = await realpath(path);
  const immediate = await lstat(path, { bigint: true });
  const immediateCanonical = await realpath(path);
  assert(
    firstCanonical === path
      && immediateCanonical === path
      && first.isDirectory()
      && !first.isSymbolicLink()
      && immediate.isDirectory()
      && !immediate.isSymbolicLink()
      && first.nlink >= 1n
      && immediate.nlink === first.nlink
      && first.dev === expectedDev
      && first.ino === expectedIno
      && immediate.dev === first.dev
      && immediate.ino === first.ino,
    `cleanup directory identity changed before traversal: ${path}`,
  );
}

async function assertCleanupFileIdentity(path: string, captured: BigIntStats): Promise<void> {
  const first = await lstat(path, { bigint: true });
  const firstCanonical = await realpath(path);
  const immediate = await lstat(path, { bigint: true });
  const immediateCanonical = await realpath(path);
  assert(
    firstCanonical === path
      && immediateCanonical === path
      && captured.isFile()
      && !captured.isSymbolicLink()
      && captured.nlink === 1n
      && first.isFile()
      && !first.isSymbolicLink()
      && first.nlink === 1n
      && immediate.isFile()
      && !immediate.isSymbolicLink()
      && immediate.nlink === 1n
      && first.dev === captured.dev
      && first.ino === captured.ino
      && immediate.dev === first.dev
      && immediate.ino === first.ino
      && first.mode === captured.mode
      && immediate.mode === first.mode
      && first.size === captured.size
      && immediate.size === first.size
      && first.mtimeNs === captured.mtimeNs
      && immediate.mtimeNs === first.mtimeNs
      && first.ctimeNs === captured.ctimeNs
      && immediate.ctimeNs === first.ctimeNs,
    `cleanup file identity, link count, or metadata changed: ${path}`,
  );
}

async function assertCleanupEmptyDirectory(path: string, captured: BigIntStats): Promise<void> {
  const held = await inspectHeldEmptyDirectory(path);
  const final = await lstat(path, { bigint: true });
  const finalCanonical = await realpath(path);
  assert(
    held.firstCanonical === path
      && held.immediateCanonical === path
      && finalCanonical === path
      && captured.isDirectory()
      && !captured.isSymbolicLink()
      && held.first.isDirectory()
      && !held.first.isSymbolicLink()
      && held.immediate.isDirectory()
      && !held.immediate.isSymbolicLink()
      && final.isDirectory()
      && !final.isSymbolicLink()
      && held.first.nlink >= 1n
      && held.immediate.nlink === held.first.nlink
      && final.nlink === held.first.nlink
      && held.first.dev === captured.dev
      && held.first.ino === captured.ino
      && held.immediate.dev === held.first.dev
      && held.immediate.ino === held.first.ino
      && final.dev === held.first.dev
      && final.ino === held.first.ino
      && held.firstEntry === null
      && held.immediateEntry === null,
    `cleanup directory is occupied, linked, aliased, or changed: ${path}`,
  );
}

async function assertOwnedRoot(root: OwnedProofRoot): Promise<void> {
  const first = await lstat(root.path, { bigint: true });
  const firstCanonical = await realpath(root.path);
  const immediate = await lstat(root.path, { bigint: true });
  const immediateCanonical = await realpath(root.path);
  assert(
    firstCanonical === root.path
      && immediateCanonical === root.path
      && dirname(root.path) === root.parent
      && basename(root.path).startsWith(PROOF_ROOT_PREFIX)
      && first.isDirectory()
      && !first.isSymbolicLink()
      && immediate.isDirectory()
      && !immediate.isSymbolicLink()
      && first.nlink >= 1n
      && immediate.nlink === first.nlink
      && first.dev === root.dev
      && first.ino === root.ino
      && immediate.dev === first.dev
      && immediate.ino === first.ino,
    "proof cleanup root failed its repeated ownership guard",
  );
}

async function assertOwnedEmptyRoot(root: OwnedProofRoot): Promise<void> {
  const held = await inspectHeldEmptyDirectory(root.path);
  const final = await lstat(root.path, { bigint: true });
  const finalCanonical = await realpath(root.path);
  assert(
    held.firstCanonical === root.path
      && held.immediateCanonical === root.path
      && finalCanonical === root.path
      && dirname(root.path) === root.parent
      && basename(root.path).startsWith(PROOF_ROOT_PREFIX)
      && held.first.isDirectory()
      && !held.first.isSymbolicLink()
      && held.immediate.isDirectory()
      && !held.immediate.isSymbolicLink()
      && final.isDirectory()
      && !final.isSymbolicLink()
      && held.first.nlink >= 1n
      && held.immediate.nlink === held.first.nlink
      && final.nlink === held.first.nlink
      && held.first.dev === root.dev
      && held.first.ino === root.ino
      && held.immediate.dev === held.first.dev
      && held.immediate.ino === held.first.ino
      && final.dev === held.first.dev
      && final.ino === held.first.ino
      && held.firstEntry === null
      && held.immediateEntry === null,
    "proof cleanup root is occupied, linked, aliased, or changed",
  );
}

async function inspectHeldEmptyDirectory(path: string): Promise<Readonly<{
  first: BigIntStats;
  firstCanonical: string;
  firstEntry: Dirent | null;
  immediate: BigIntStats;
  immediateCanonical: string;
  immediateEntry: Dirent | null;
}>> {
  const directory = await opendir(path);
  try {
    const first = await lstat(path, { bigint: true });
    const firstCanonical = await realpath(path);
    const firstEntry = await directory.read();
    const immediate = await lstat(path, { bigint: true });
    const immediateCanonical = await realpath(path);
    const immediateEntry = await directory.read();
    return Object.freeze({
      first,
      firstCanonical,
      firstEntry,
      immediate,
      immediateCanonical,
      immediateEntry,
    });
  } finally {
    await directory.close();
  }
}

async function assertOwnedParent(root: OwnedProofRoot): Promise<void> {
  const first = await lstat(root.parent, { bigint: true });
  const firstCanonical = await realpath(root.parent);
  const immediate = await lstat(root.parent, { bigint: true });
  const immediateCanonical = await realpath(root.parent);
  assert(
    firstCanonical === root.parent
      && immediateCanonical === root.parent
      && first.isDirectory()
      && !first.isSymbolicLink()
      && first.dev === root.parentDev
      && first.ino === root.parentIno
      && immediate.isDirectory()
      && !immediate.isSymbolicLink()
      && first.nlink >= 1n
      && immediate.nlink === first.nlink
      && immediate.dev === first.dev
      && immediate.ino === first.ino,
    "proof cleanup parent failed its repeated ownership guard",
  );
}

function must<T, E>(result: ReleaseResult<T, E>): T {
  if (!result.ok) throw new Error(`generated proof data was invalid: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
