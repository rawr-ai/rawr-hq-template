import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import type { BigIntStats } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { makeNodeExportDestinationPort } from "@rawr/resource-agent-plugin-export-destination/providers/effect-platform-node";
import type { VerifiedArtifactSnapshotV1 } from "../../../src/service/shared/release/index";

import {
  createExportOwnerStateReader,
  createKnownNativeHomesSnapshot,
  executeExportInverseActionWithResource,
  verifyExportLedgerBytes,
  EXPORT_LEDGER_FILENAME,
  type ExportAgentPluginsRequest,
  type ExportAppliedObservationV1,
  type ExportDestinationAsyncPort,
  type ExportDestinationCapture,
  type ExportFailpoints,
  type ExportLifecycleHostRuntime,
  type UndoApplyingSession,
  type UndoBeginResult,
  type UndoCandidateInput,
  type UndoTerminalWriteResult,
  type UndoWriteResult,
  type UndoWriter,
} from "../../../src/bindings/exports";
import { alphaOnlyArtifactFixture, exportArtifactFixture } from "./artifact-fixture";
import { createLifecycleTestClient, testInvocation } from "../../support/client";
import {
  createSeededArtifactRepository,
  type SeededArtifactRepository,
} from "../../support/artifact-repository";

const FIXTURE_PREFIX = "rawr-export-service-test-";

interface OwnedRoot {
  readonly path: string;
  readonly parent: string;
  readonly dev: bigint;
  readonly ino: bigint;
}

const roots: OwnedRoot[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await cleanupRoot(root);
});

describe("export service destination authority", () => {
  it("settles a complete set and repeats without changing destination bytes or identities", async () => {
    const root = await createRoot();
    const fixture = exportArtifactFixture();
    const undo = new RecordingUndoWriter();
    const resource = makeNodeExportDestinationPort();
    const runtime = await lifecycleRuntime([fixture.complete], undo, resource);

    const first = await executeExportAgentPlugins(request(fixture.complete.ref, "complete-set", root.path), runtime);
    expect(first.kind, JSON.stringify(first)).toBe("MutatedSettled");
    const alpha = join(root.path, "codex/plugins/alpha/skills/alpha/SKILL.md");
    const beta = join(root.path, "codex/plugins/beta/agents/beta.md");
    const ledger = join(root.path, EXPORT_LEDGER_FILENAME);
    expect(await readFile(alpha, "utf8")).toBe("alpha-v1\n");
    expect(await readFile(beta, "utf8")).toBe("beta-v1\n");
    const before = await Promise.all([alpha, beta, ledger].map((path) => lstat(path, { bigint: true })));
    const writesBefore = undoAuthorityCalls(undo);
    const readsBeforeRepeat = runtime.artifactRepository.readTreeCalls;

    const second = await executeExportAgentPlugins(request(fixture.complete.ref, "complete-set", root.path), runtime);
    const after = await Promise.all([alpha, beta, ledger].map((path) => lstat(path, { bigint: true })));
    expect(second.kind).toBe("ReadOnlyConverged");
    expect(undoAuthorityCalls(undo)).toEqual(writesBefore);
    expect(after.map(identityTuple)).toEqual(before.map(identityTuple));
    expect(runtime.artifactRepository.readTreeCalls).toBe(readsBeforeRepeat + 3);
  });

  it("uses the live artifact observation on repeat without changing settled destination state", async () => {
    const root = await createRoot();
    const fixture = exportArtifactFixture();
    const undo = new RecordingUndoWriter();
    const runtime = await lifecycleRuntime(
      [fixture.complete],
      undo,
      makeNodeExportDestinationPort(),
    );

    const first = await executeExportAgentPlugins(
      request(fixture.complete.ref, "complete-set", root.path),
      runtime,
    );
    expect(first.kind).toBe("MutatedSettled");
    const paths = [
      join(root.path, "codex/plugins/alpha/skills/alpha/SKILL.md"),
      join(root.path, "codex/plugins/beta/agents/beta.md"),
      join(root.path, EXPORT_LEDGER_FILENAME),
    ];
    const identitiesBefore = await Promise.all(paths.map((path) => lstat(path, { bigint: true })));
    const bytesBefore = await Promise.all(paths.map((path) => readFile(path)));
    const writesBefore = undoAuthorityCalls(undo);
    runtime.artifactRepository.replaceEntry(
      fixture.alpha.release.artifactDigest,
      "release.json",
      new TextEncoder().encode("{}\n"),
    );

    const repeated = await executeExportAgentPlugins(
      request(fixture.complete.ref, "complete-set", root.path),
      runtime,
    );

    expect(repeated).toMatchObject({
      kind: "RejectedBeforeMutation",
      failure: {
        code: "ArtifactMismatch",
        phase: "artifact-read",
        message: expect.stringContaining("ReferenceMismatch:artifact"),
      },
    });
    expect(undoAuthorityCalls(undo)).toEqual(writesBefore);
    expect((await Promise.all(paths.map((path) => lstat(path, { bigint: true }))))
      .map(identityTuple)).toEqual(identitiesBefore.map(identityTuple));
    expect(await Promise.all(paths.map((path) => readFile(path)))).toEqual(bytesBefore);
  });

  it("rejects a missing artifact before destination capture or undo admission", async () => {
    const root = await createRoot();
    const fixture = alphaOnlyArtifactFixture();
    const undo = new RecordingUndoWriter();
    const probe = captureProbe();
    const runtime = await lifecycleRuntime([], undo, probe.port);

    const result = await executeExportAgentPlugins(
      request(fixture.alpha.ref, "targeted-release", root.path),
      runtime,
    );

    expect(result).toMatchObject({
      kind: "RejectedBeforeMutation",
      failure: { code: "ArtifactMissing", phase: "artifact-read" },
    });
    expect(runtime.artifactRepository.readTreeCalls).toBe(1);
    expect(probe.captures).toEqual([]);
    expect(undo.preflightCalls).toBe(0);
    expect(undo.beginCalls).toBe(0);
  });

  it("closes a repository read exception before destination capture or undo admission", async () => {
    const root = await createRoot();
    const fixture = alphaOnlyArtifactFixture();
    const undo = new RecordingUndoWriter();
    const probe = captureProbe();
    const runtime = await lifecycleRuntime([fixture.alpha], undo, probe.port);
    runtime.artifactRepository.rejectNextTreeRead("repository read failed");

    const result = await executeExportAgentPlugins(
      request(fixture.alpha.ref, "targeted-release", root.path),
      runtime,
    );

    expect(result).toMatchObject({
      kind: "RejectedBeforeMutation",
      failure: {
        code: "ArtifactMismatch",
        phase: "artifact-read",
        message: expect.stringContaining("InvalidStoreRoot:artifact"),
      },
    });
    expect(runtime.artifactRepository.readTreeCalls).toBe(1);
    expect(probe.captures).toEqual([]);
    expect(undo.preflightCalls).toBe(0);
    expect(undo.beginCalls).toBe(0);
  });

  it("maps a mismatched service artifact before destination capture or undo admission", async () => {
    const root = await createRoot();
    const fixture = alphaOnlyArtifactFixture();
    const undo = new RecordingUndoWriter();
    const probe = captureProbe();
    const runtime = await lifecycleRuntime([fixture.alpha], undo, probe.port);
    runtime.artifactRepository.replaceEntry(
      fixture.alpha.release.artifactDigest,
      "release.json",
      new TextEncoder().encode("{}\n"),
    );

    const result = await executeExportAgentPlugins(
      request(fixture.alpha.ref, "targeted-release", root.path),
      runtime,
    );

    expect(result).toMatchObject({
      kind: "RejectedBeforeMutation",
      failure: {
        code: "ArtifactMismatch",
        phase: "artifact-read",
        message: expect.stringContaining("MalformedEnvelope:artifact"),
      },
    });
    expect(runtime.artifactRepository.readTreeCalls).toBe(1);
    expect(probe.captures).toEqual([]);
    expect(undo.preflightCalls).toBe(0);
    expect(undo.beginCalls).toBe(0);
  });

  it("updates one targeted scope while preserving the independent peer scope", async () => {
    const root = await createRoot();
    const initial = exportArtifactFixture();
    const updated = exportArtifactFixture("alpha-v2\n", "beta-v1\n", "skills/alpha-v2/SKILL.md");
    const resource = makeNodeExportDestinationPort();
    const runtime = await lifecycleRuntime(
      [initial.complete, updated.alpha],
      new RecordingUndoWriter(),
      resource,
    );
    expect((await executeExportAgentPlugins(request(initial.complete.ref, "complete-set", root.path), runtime)).kind)
      .toBe("MutatedSettled");
    const beta = join(root.path, "codex/plugins/beta/agents/beta.md");
    const betaBefore = await lstat(beta, { bigint: true });

    const result = await executeExportAgentPlugins(request(updated.alpha.ref, "targeted-release", root.path), runtime);
    expect(result.kind).toBe("MutatedSettled");
    await expect(lstat(join(root.path, "codex/plugins/alpha/skills/alpha/SKILL.md"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(join(root.path, "codex/plugins/alpha/skills/alpha-v2/SKILL.md"), "utf8")).toBe("alpha-v2\n");
    expect(identityTuple(await lstat(beta, { bigint: true }))).toEqual(identityTuple(betaBefore));
    const verified = verifyExportLedgerBytes(new Uint8Array(await readFile(join(root.path, EXPORT_LEDGER_FILENAME))), root.path);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.ledger.body.completeSet).toBeNull();
      expect(verified.ledger.body.scopes.map((scope) => scope.pluginId)).toEqual(["alpha", "beta"]);
    }
  });

  it("replays the service-authored inverse sequence back to the exact prior content state", async () => {
    const root = await createRoot();
    const fixture = alphaOnlyArtifactFixture();
    const undo = new RecordingUndoWriter();
    const resource = makeNodeExportDestinationPort();
    const result = await executeExportAgentPlugins(
      request(fixture.complete.ref, "complete-set", root.path),
      await lifecycleRuntime([fixture.complete], undo, resource),
    );
    expect(result.kind).toBe("MutatedSettled");

    for (const committed of [...undo.committed].reverse()) {
      const replay = await executeExportInverseActionWithResource(
        committed.action,
        committed.observation,
        resource,
      );
      expect(replay.kind).toBe("RevertedVerified");
    }
    await expect(lstat(join(root.path, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(root.path, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("consumes every capture from repeated planning rejection", async () => {
    const root = await createRoot();
    const fixture = alphaOnlyArtifactFixture();
    const collision = join(root.path, "codex/plugins/alpha/skills/alpha/SKILL.md");
    await mkdir(dirname(collision), { recursive: true });
    await writeFile(collision, "unmanaged\n");
    const probe = captureProbe();
    const runtime = await lifecycleRuntime([fixture.complete], new RecordingUndoWriter(), probe.port);

    const first = await executeExportAgentPlugins(request(fixture.complete.ref, "complete-set", root.path), runtime);
    const second = await executeExportAgentPlugins(request(fixture.complete.ref, "complete-set", root.path), runtime);

    expect(first.kind).toBe("RejectedBeforeMutation");
    expect(second.kind).toBe("RejectedBeforeMutation");
    expect(await readFile(collision, "utf8")).toBe("unmanaged\n");
    await expectAllCapturedAuthorityReleased(probe);
  });

  it("releases all multi-destination captures when undo preflight rejects", async () => {
    const left = await createRoot();
    const right = await createRoot();
    const fixture = alphaOnlyArtifactFixture();
    const probe = captureProbe();
    const undo: UndoWriter = Object.freeze({
      preflight: async () => Object.freeze({ kind: "Rejected" as const, failure: undoFailure("preflight rejected") }),
      begin: async () => { throw new Error("begin must not run"); },
    });
    const runtime = await lifecycleRuntime([fixture.complete], undo, probe.port);

    const result = await executeExportAgentPlugins(
      requestForDestinations(fixture.complete.ref, "complete-set", [left.path, right.path]),
      runtime,
    );

    expect(result.kind).toBe("RejectedBeforeMutation");
    expect(probe.captures).toHaveLength(2);
    await expectAllCapturedAuthorityReleased(probe);
  });

  it("admits and applies one canonical action sequence for reversed destination input", async () => {
    const left = await createRoot();
    const right = await createRoot();
    const fixture = alphaOnlyArtifactFixture();
    const undo = new RecordingUndoWriter();
    const canonicalDestinations = [left.path, right.path].sort();
    const runtime = await lifecycleRuntime(
      [fixture.complete],
      undo,
      makeNodeExportDestinationPort(),
    );

    const result = await executeExportAgentPlugins(
      requestForDestinations(fixture.complete.ref, "complete-set", [...canonicalDestinations].reverse()),
      runtime,
    );

    expect(result.kind).toBe("MutatedSettled");
    const appliedDestinations = undo.committed.map(({ action }) => action.canonicalDestination);
    expect(appliedDestinations).toEqual([...appliedDestinations].sort());
    expect(new Set(appliedDestinations)).toEqual(new Set(canonicalDestinations));
    expect(undo.stageCalls).toBe(undo.markCalls);
  });

  it("keeps owner recovery reads within the admitted action byte bound", async () => {
    const root = await createRoot();
    const relativePath = "managed/oversized.txt";
    await mkdir(dirname(join(root.path, relativePath)), { recursive: true });
    await writeFile(join(root.path, relativePath), "bounded-owner-state\n");
    const state = createExportOwnerStateReader(makeNodeExportDestinationPort());
    const destination = await state.captureDestination(root.path);

    await expect(state.capturePath(destination, relativePath, 4)).rejects.toMatchObject({
      failure: {
        code: "ManagedStateMismatch",
        phase: expect.stringContaining("LimitExceeded"),
      },
    });
    await expect(state.capturePath(destination, relativePath, 64)).resolves.toMatchObject({
      kind: "Present",
    });
  });

  it("releases the destination capture when the post-plan failpoint rejects", async () => {
    const root = await createRoot();
    const fixture = alphaOnlyArtifactFixture();
    const probe = captureProbe();
    const failpoints: ExportFailpoints = Object.freeze({
      hit: async (point: Parameters<ExportFailpoints["hit"]>[0]) => {
        if (point === "AfterPlan") throw new Error("post-plan stop");
      },
    });
    const runtime = await lifecycleRuntime(
      [fixture.complete],
      new RecordingUndoWriter(),
      probe.port,
      { failpoints },
    );

    const result = await executeExportAgentPlugins(request(fixture.complete.ref, "complete-set", root.path), runtime);

    expect(result.kind).toBe("RejectedBeforeMutation");
    await expectAllCapturedAuthorityReleased(probe);
  });

  it.each(["throw", "reject", "unsettled"] as const)(
    "releases the destination capture when undo begin exits with %s",
    async (exit) => {
      const root = await createRoot();
      const fixture = alphaOnlyArtifactFixture();
      const probe = captureProbe();
      const undo = beginExitWriter(exit);

      const result = await executeExportAgentPlugins(
        request(fixture.complete.ref, "complete-set", root.path),
        await lifecycleRuntime([fixture.complete], undo, probe.port),
      );

      expect(result.kind).toBe(exit === "unsettled" ? "MutatedUnsettled" : "RejectedBeforeMutation");
      await expectAllCapturedAuthorityReleased(probe);
    },
  );

  it("rejects and releases the destination capture when inverse staging stops before apply", async () => {
    const root = await createRoot();
    const fixture = alphaOnlyArtifactFixture();
    const probe = captureProbe();
    const failpoints: ExportFailpoints = Object.freeze({
      hit: async (point: Parameters<ExportFailpoints["hit"]>[0]) => {
        if (point === "AfterInverseStaged") throw new Error("staging stop");
      },
    });
    const runtime = await lifecycleRuntime(
      [fixture.complete],
      new RecordingUndoWriter(),
      probe.port,
      { failpoints },
    );

    const result = await executeExportAgentPlugins(request(fixture.complete.ref, "complete-set", root.path), runtime);

    expect(result.kind).toBe("RejectedBeforeMutation");
    await expectAllCapturedAuthorityReleased(probe);
    await expect(lstat(join(root.path, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});

interface ExportTestRuntime extends SeededArtifactRepository {
  readonly exports: ExportLifecycleHostRuntime;
}

async function lifecycleRuntime(
  snapshots: readonly VerifiedArtifactSnapshotV1[],
  undoWriter: UndoWriter,
  destinationRuntime: ReturnType<typeof makeNodeExportDestinationPort>,
  options: Partial<Pick<ExportLifecycleHostRuntime, "failpoints">> = {},
): Promise<ExportTestRuntime> {
  const homes = createKnownNativeHomesSnapshot([]);
  if (!homes.ok) throw new Error(homes.failure.message);
  const artifacts = await createSeededArtifactRepository(snapshots);
  return Object.freeze({
    ...artifacts,
    exports: Object.freeze({
      knownNativeHomesReader: Object.freeze({
        readCompleteSnapshot: async () => Object.freeze({ kind: "Verified" as const, snapshot: homes.snapshot }),
      }),
      undoWriter,
      destinationRuntime,
      operationId: () => "service-behavior",
      ...options,
    }),
  });
}

async function executeExportAgentPlugins(
  request: ExportAgentPluginsRequest,
  runtime: ExportTestRuntime,
) {
  const client = createLifecycleTestClient({
    artifactRepository: runtime.artifactRepository,
    artifactRepositoryRoot: runtime.artifactRepositoryRoot,
    exports: runtime.exports,
  });
  return client.exports.apply(request, testInvocation);
}

function request(
  artifactRef: ExportAgentPluginsRequest["artifactRef"],
  mode: ExportAgentPluginsRequest["mode"],
  destination: string,
): ExportAgentPluginsRequest {
  return requestForDestinations(artifactRef, mode, [destination]);
}

function requestForDestinations(
  artifactRef: ExportAgentPluginsRequest["artifactRef"],
  mode: ExportAgentPluginsRequest["mode"],
  destinations: readonly string[],
): ExportAgentPluginsRequest {
  return Object.freeze({
    protocolVersion: 1,
    artifactRef,
    mode,
    layout: "codex-v1",
    destinations: Object.freeze([...destinations]),
    overwritePolicy: "managed-only",
  });
}

interface CaptureProbe {
  readonly base: ExportDestinationAsyncPort;
  readonly port: ExportDestinationAsyncPort;
  readonly captures: ExportDestinationCapture[];
  readonly releasedHandles: string[];
}

function captureProbe(): CaptureProbe {
  const base = makeNodeExportDestinationPort();
  const captures: ExportDestinationCapture[] = [];
  const releasedHandles: string[] = [];
  const port: ExportDestinationAsyncPort = Object.freeze({
    ...base,
    capture: async (input: Parameters<ExportDestinationAsyncPort["capture"]>[0]) => {
      const captured = await base.capture(input);
      captures.push(captured);
      return captured;
    },
    release: async (input: Parameters<ExportDestinationAsyncPort["release"]>[0]) => {
      const receipt = await base.release(input);
      releasedHandles.push(receipt.handle);
      return receipt;
    },
  });
  return Object.freeze({ base, port, captures, releasedHandles });
}

async function expectAllCapturedAuthorityReleased(probe: CaptureProbe): Promise<void> {
  expect(probe.releasedHandles).toEqual(probe.captures.map((capture) => capture.handle));
  for (const capture of probe.captures) {
    await expect(probe.base.release({
      destination: capture.canonicalDestination,
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })).rejects.toMatchObject({
      _tag: "ExportDestinationFailure",
      operation: "release",
      reason: "HandleConsumed",
    });
  }
}

function beginExitWriter(exit: "throw" | "reject" | "unsettled"): UndoWriter {
  return Object.freeze({
    preflight: async () => Object.freeze({ kind: "Accepted" as const }),
    begin: async (): Promise<UndoBeginResult> => {
      if (exit === "throw") throw new Error("begin failed");
      if (exit === "reject") return Object.freeze({
        kind: "Rejected",
        failure: undoFailure("begin rejected"),
        synchronization: Object.freeze({ kind: "NotAcquired" }),
      });
      return Object.freeze({
        kind: "Unsettled",
        generation: "begin-unsettled",
        failure: undoFailure("begin unsettled"),
        recoveryRequired: true,
        synchronization: Object.freeze({ kind: "Released" }),
      });
    },
  });
}

function undoFailure(message: string) {
  return Object.freeze({ code: "TestUndoFailure", phase: "test", message });
}

interface RecordedAction {
  readonly action: UndoCandidateInput["actions"][number]["action"];
  readonly handle: string;
  phase: "planned" | "staged" | "applied";
  observation?: ExportAppliedObservationV1;
}

class RecordingUndoWriter implements UndoWriter {
  preflightCalls = 0;
  beginCalls = 0;
  stageCalls = 0;
  markCalls = 0;
  settleCalls = 0;
  readonly committed: Array<Readonly<{
    action: RecordedAction["action"];
    observation: ExportAppliedObservationV1;
  }>> = [];
  #generation = 0;

  async preflight() {
    this.preflightCalls += 1;
    return Object.freeze({ kind: "Accepted" as const });
  }

  async begin(input: UndoCandidateInput): Promise<UndoBeginResult> {
    this.beginCalls += 1;
    const actions: RecordedAction[] = input.actions.map((entry, index) => ({
      action: entry.action,
      handle: `action-${this.beginCalls}-${index}`,
      phase: "planned",
    }));
    let closed = false;
    const session: UndoApplyingSession = Object.freeze({
      stage: async (input: Parameters<UndoApplyingSession["stage"]>[0]) => {
        const { actionHandle } = input;
        this.stageCalls += 1;
        const action = actions.find((candidate) => candidate.phase !== "applied");
        if (closed || action?.handle !== actionHandle || action.phase !== "planned") return rejectedWrite("stage refused");
        action.phase = "staged";
        return acceptedWrite(this.#nextGeneration());
      },
      discardStaged: async (input: Parameters<UndoApplyingSession["discardStaged"]>[0]) => {
        const { actionHandle } = input;
        const action = actions.find((candidate) => candidate.handle === actionHandle);
        if (closed || action?.phase !== "staged") return rejectedWrite("discard refused");
        action.phase = "planned";
        return acceptedWrite(this.#nextGeneration());
      },
      markApplied: async (input: Parameters<UndoApplyingSession["markApplied"]>[0]) => {
        const { actionHandle, observedPost } = input;
        this.markCalls += 1;
        const action = actions.find((candidate) => candidate.handle === actionHandle);
        if (closed || action?.phase !== "staged") return rejectedWrite("mark refused");
        action.phase = "applied";
        action.observation = observedPost;
        return acceptedWrite(this.#nextGeneration());
      },
      settle: async () => {
        this.settleCalls += 1;
        closed = true;
        for (const action of actions) {
          if (action.phase === "applied" && action.observation !== undefined) {
            this.committed.push(Object.freeze({ action: action.action, observation: action.observation }));
          }
        }
        return terminalWrite(acceptedWrite(this.#nextGeneration()));
      },
      abort: async () => {
        closed = true;
        return terminalWrite(acceptedWrite(this.#nextGeneration()));
      },
      suspend: async () => {
        closed = true;
        return Object.freeze({ kind: "Released" as const });
      },
    });
    return Object.freeze({
      kind: "Accepted",
      generation: this.#nextGeneration(),
      admittedActions: Object.freeze(actions.map((action) => Object.freeze({ actionHandle: action.handle }))),
      session,
    });
  }

  #nextGeneration(): string {
    this.#generation += 1;
    return `generation-${this.#generation}`;
  }
}

function undoAuthorityCalls(undo: RecordingUndoWriter): readonly number[] {
  return [
    undo.preflightCalls,
    undo.beginCalls,
    undo.stageCalls,
    undo.markCalls,
    undo.settleCalls,
  ];
}

function acceptedWrite(generation: string): UndoWriteResult {
  return Object.freeze({ kind: "Accepted", generation });
}

function rejectedWrite(message: string): UndoWriteResult {
  return Object.freeze({
    kind: "Rejected",
    failure: Object.freeze({ code: "UndoStageFailed", phase: "recording-writer", message }),
  });
}

function terminalWrite(result: UndoWriteResult): UndoTerminalWriteResult {
  return Object.freeze({ ...result, synchronization: Object.freeze({ kind: "Released" }) });
}

async function createRoot(): Promise<OwnedRoot> {
  const path = await realpath(await mkdtemp(join(tmpdir(), FIXTURE_PREFIX)));
  const info = await lstat(path, { bigint: true });
  const root = Object.freeze({ path, parent: dirname(path), dev: info.dev, ino: info.ino });
  roots.push(root);
  return root;
}

async function cleanupRoot(root: OwnedRoot): Promise<void> {
  const info = await lstat(root.path, { bigint: true });
  if (
    dirname(root.path) !== root.parent
    || !root.path.includes(`/${FIXTURE_PREFIX}`)
    || !info.isDirectory()
    || info.isSymbolicLink()
    || info.dev !== root.dev
    || info.ino !== root.ino
  ) throw new Error(`Refusing to clean unowned export service fixture: ${root.path}`);
  await rm(root.path, { recursive: true, force: false });
}

function identityTuple(info: BigIntStats): readonly unknown[] {
  return [info.dev, info.ino, info.mode, info.mtimeNs, info.ctimeNs];
}
