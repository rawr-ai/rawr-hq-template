import { chmod, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import type { BigIntStats } from "node:fs";
import { dirname, join } from "node:path";

import {
  EXPORT_APPLICATION_PROTOCOL_VERSION,
  EXPORT_LEDGER_FILENAME,
  parseExportOwnerAction,
  type ExportAgentPluginsRequest,
  type ExportFailpoints,
  type UndoApplyingSession,
  type UndoWriter,
} from "@rawr/agent-plugin-lifecycle/bindings/exports";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CapsuleControllerWriterV1,
  CapsuleUndoControllerV1,
  ClosedOwnerProtocolRegistryV1,
  createExportOwnerProtocolRegistrationV1,
  createExportUndoWriterV1,
  createInitialCapsuleState,
  type OwnerProtocolRegistrationV1,
} from "../../../src/lib/agent-plugins/undo";
import { exportArtifactFixture } from "../../../../../services/agent-plugin-lifecycle/test/modules/exports/artifact-fixture";
import {
  createExportTestClient,
  FakeArtifactReader,
  FakeKnownNativeHomesReader,
  knownHomes,
} from "./export-runtime-fixture";
import { InMemoryCapsuleStateStoreV1 } from "./memory-store";
import { createOwnedFixtureRoot, type OwnedFixtureRoot } from "./owned-fixture-root";

describe("production export owner protocol", () => {
  let root: OwnedFixtureRoot;

  beforeEach(async () => {
    root = await createOwnedFixtureRoot();
  });

  afterEach(async () => {
    await root.cleanup();
  });

  it("commits one aggregate capsule, rejects target/action drift, and restores both destinations", async () => {
    const harness = createHarness();
    const fixture = exportArtifactFixture();
    const destinations = await Promise.all([
      destinationAt(root, "export-b"),
      destinationAt(root, "export-a"),
    ]);
    const client = clientFor(harness.writer, fixture.complete);

    const result = await client.exports.apply(request(fixture.complete.ref, destinations));

    expect(result.kind).toBe("MutatedSettled");
    const committed = await committedCapsule(harness.store);
    expect(committed.capsule.targets.map(({ canonicalTarget }) => canonicalTarget)).toEqual(
      [...destinations].sort(),
    );
    expect(committed.capsule.actions.length).toBeGreaterThan(2);
    for (const destination of destinations) {
      await expect(readFile(
        join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md"),
        "utf8",
      )).resolves.toBe("alpha-v1\n");
    }

    const beforeRejectedAdmission = await stateBytes(harness.store);
    const driftedTargets = committed.capsule.targets.map((target, index) => index === 0
      ? Object.freeze({ ...target, authorityGeneration: "elg1_999" })
      : target);
    expect(await harness.writer.begin({
      owner: committed.capsule.owner,
      ownerProtocolVersion: committed.capsule.ownerProtocolVersion,
      contentAuthority: committed.capsule.contentAuthority,
      targets: driftedTargets,
      actions: committed.capsule.actions.map(({ action }) => Object.freeze({ action })),
    })).toMatchObject({ kind: "Rejected", failure: { code: "InvalidOwnerAction" } });
    expect(await stateBytes(harness.store)).toEqual(beforeRejectedAdmission);

    expect(await harness.undo.undo()).toEqual({
      kind: "RestoredAndCleared",
      synchronization: { kind: "Released" },
    });
    for (const destination of destinations) {
      await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
      await expect(lstat(join(destination, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
    }
  }, 15_000);

  it("admits the ledger-closed write and retirement sequence for a real release update", async () => {
    const harness = createHarness();
    const destination = await destinationAt(root, "release-update");
    const initial = exportArtifactFixture("alpha-v1\n").alpha;
    const replacement = exportArtifactFixture(
      "alpha-v2\n",
      "beta-v1\n",
      "skills/next/SKILL.md",
    ).alpha;

    expect(await clientFor(harness.writer, initial).exports.apply(request(
      initial.ref,
      [destination],
      "targeted-release",
    ))).toMatchObject({ kind: "MutatedSettled" });
    expect(await clientFor(harness.writer, replacement).exports.apply(request(
      replacement.ref,
      [destination],
      "targeted-release",
    ))).toMatchObject({ kind: "MutatedSettled" });

    const committed = await committedCapsule(harness.store);
    const mutations = committed.capsule.actions.map(({ action }) => parseExportOwnerAction(action).mutation);
    expect(mutations).toContain("write-payload");
    expect(mutations).toContain("retire-payload");
    expect(mutations).toContain("retire-directory");
    expect(mutations.at(-1)).toBe("write-ledger");

    expect(await harness.undo.undo()).toMatchObject({ kind: "RestoredAndCleared" });
    await expect(readFile(
      join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md"),
      "utf8",
    )).resolves.toBe("alpha-v1\n");
    await expect(lstat(
      join(destination, "codex/plugins/alpha/skills/next/SKILL.md"),
    )).rejects.toMatchObject({ code: "ENOENT" });
  }, 15_000);

  it("replaces one planned unmanaged file, preserves its sibling, stutters, and restores exact prior state", async () => {
    const harness = createHarness();
    const fixture = exportArtifactFixture().alpha;
    const destination = await destinationAt(root, "replace-planned");
    const planned = join(destination, "codex/plugins/alpha/skills/alpha/SKILL.md");
    const sibling = join(destination, "codex/plugins/alpha/notes.txt");
    await mkdir(dirname(planned), { recursive: true });
    await writeFile(planned, "operator-owned\n", { mode: 0o640 });
    await writeFile(sibling, "preserve-me\n", { mode: 0o600 });
    const prior = await lstat(planned);
    const siblingPrior = await lstat(sibling, { bigint: true });
    const client = clientFor(harness.writer, fixture);
    const replacementRequest = request(
      fixture.ref,
      [destination],
      "targeted-release",
      "replace-planned",
    );

    expect(await client.exports.apply(replacementRequest)).toMatchObject({ kind: "MutatedSettled" });
    expect(await readFile(planned, "utf8")).toBe("alpha-v1\n");
    expect(await readFile(sibling, "utf8")).toBe("preserve-me\n");
    const exportedBeforeRepeat = await lstat(planned, { bigint: true });
    const ledger = join(destination, EXPORT_LEDGER_FILENAME);
    const ledgerBeforeRepeat = await lstat(ledger, { bigint: true });
    const capsuleBeforeRepeat = await stateBytes(harness.store);

    expect(await client.exports.apply(replacementRequest)).toMatchObject({ kind: "ReadOnlyConverged" });
    expect(await stateBytes(harness.store)).toEqual(capsuleBeforeRepeat);
    expect(identityTuple(await lstat(planned, { bigint: true }))).toEqual(identityTuple(exportedBeforeRepeat));
    expect(identityTuple(await lstat(ledger, { bigint: true }))).toEqual(identityTuple(ledgerBeforeRepeat));
    expect(await readFile(sibling, "utf8")).toBe("preserve-me\n");

    expect(await harness.undo.undo()).toEqual({
      kind: "RestoredAndCleared",
      synchronization: { kind: "Released" },
    });
    expect(await readFile(planned, "utf8")).toBe("operator-owned\n");
    expect((await lstat(planned)).mode & 0o777).toBe(prior.mode & 0o777);
    await expect(lstat(ledger)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(sibling, "utf8")).toBe("preserve-me\n");
    expect(identityTuple(await lstat(sibling, { bigint: true }))).toEqual(identityTuple(siblingPrior));
    expect(await harness.undo.undo()).toEqual({
      kind: "NoCommittedCapsule",
      synchronization: { kind: "Released" },
    });
  }, 15_000);

  it("settles and restores only the target subset represented by an applied aggregate prefix", async () => {
    const harness = createHarness();
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const first = await destinationAt(root, "partial-a");
    const second = await destinationAt(root, "partial-b");
    const third = await destinationAt(root, "partial-c");
    let failed = false;
    const failpoints: ExportFailpoints = {
      async hit(point, context) {
        if (point === "AfterInverseStaged" && context.destination === second && !failed) {
          failed = true;
          throw new Error("reject second destination before its first mutation");
        }
      },
    };
    const client = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: createExportUndoWriterV1(harness.writer),
      failpoints,
    });

    const result = await client.exports.apply(request(
      fixture.alpha.ref,
      [first, second, third],
      "targeted-release",
    ));

    expect(result.kind).toBe("MutatedSettled");
    expect(result.destinations.map(({ kind }) => kind)).toEqual([
      "MutatedSettled",
      "RejectedBeforeMutation",
      "RejectedBeforeMutation",
    ]);
    const committed = await committedCapsule(harness.store);
    expect(committed.capsule.targets).toHaveLength(1);
    expect(committed.capsule.targets[0]!.canonicalTarget).toBe(first);
    expect(new Set(committed.capsule.actions.map(({ action }) =>
      parseExportOwnerAction(action).canonicalDestination))).toEqual(new Set([first]));

    expect(await harness.undo.undo()).toEqual({
      kind: "RestoredAndCleared",
      synchronization: { kind: "Released" },
    });
    await expect(lstat(join(first, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(second, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(third, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  }, 15_000);

  it("exports nonterminal release failure without replacing its unsettled lifecycle failure", async () => {
    const harness = createHarness();
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "mark-unsettled-release");
    let injected = false;
    const failpoints: ExportFailpoints = {
      async hit(point) {
        if (point !== "AfterDirectoriesCreated" || injected) return;
        injected = true;
        harness.store.injectNextCasUnsettled({
          code: "StatePublicationFailed",
          phase: "mark-publication",
          message: "observed-post publication cannot be classified",
        });
        harness.store.injectNextReleaseFailure("injected mark release failure");
      },
    };
    const client = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: createExportUndoWriterV1(harness.writer),
      failpoints,
    });

    const result = await client.exports.apply(request(
      fixture.alpha.ref,
      [destination],
      "targeted-release",
    ));

    expect(result).toMatchObject({
      kind: "MutatedUnsettled",
      synchronization: {
        kind: "ReleaseFailed",
        failure: { phase: "undo-release:AdmissionUnsafe" },
      },
      destinations: [{
        kind: "MutatedUnsettled",
        failures: {
          primary: {
            code: "UndoStageFailed",
            phase: "undo-mark-applied:StatePublicationFailed",
            message: expect.stringContaining("observed-post publication cannot be classified"),
          },
        },
      }],
    });
    expect((await state(harness.store)).body.state.kind).toBe("applying");
  }, 15_000);

  it("cold-settles an exact intra-destination prefix but rejects it as a complete admission", async () => {
    const harness = createHarness();
    const fixture = exportArtifactFixture();
    const artifacts = new FakeArtifactReader();
    artifacts.add(fixture.alpha);
    const destination = await destinationAt(root, "intra-destination-prefix");
    let stagedActions = 0;
    const failpoints: ExportFailpoints = {
      async hit(point) {
        if (point === "AfterInverseStaged" && ++stagedActions === 2) {
          throw new Error("stop after the first applied action");
        }
      },
    };
    const client = createExportTestClient({
      artifactReader: artifacts,
      knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
      undoWriter: createExportUndoWriterV1(harness.writer),
      failpoints,
    });

    expect(await client.exports.apply(request(
      fixture.alpha.ref,
      [destination],
      "targeted-release",
    ))).toMatchObject({ kind: "MutatedUnsettled" });

    const coldWriter = new CapsuleControllerWriterV1({
      store: harness.store,
      registry: harness.registry,
    });
    expect(await coldWriter.recoverApplying()).toMatchObject({ kind: "RecoveredCommitted" });
    const committed = await committedCapsule(harness.store);
    expect(committed.capsule.actions).toHaveLength(1);
    expect(parseExportOwnerAction(committed.capsule.actions[0]!.action).mutation).toBe("create-directory");

    expect(await harness.undo.undo()).toMatchObject({ kind: "RestoredAndCleared" });
    expect(await harness.writer.begin({
      owner: committed.capsule.owner,
      ownerProtocolVersion: committed.capsule.ownerProtocolVersion,
      contentAuthority: committed.capsule.contentAuthority,
      targets: committed.capsule.targets,
      actions: [Object.freeze({ action: committed.capsule.actions[0]!.action })],
    })).toMatchObject({
      kind: "Rejected",
      failure: { code: "InvalidOwnerAction" },
    });
    expect((await state(harness.store)).body.state).toEqual({ kind: "idle", committed: null });
  }, 15_000);

  it("cold-recovers a real staged action only when the exact prior state remains live", async () => {
    const harness = createHarness();
    const fixture = exportArtifactFixture();
    const destination = await destinationAt(root, "staged-recovery");
    const client = clientFor(harness.writer, fixture.alpha);
    expect((await client.exports.apply(request(fixture.alpha.ref, [destination], "targeted-release"))).kind)
      .toBe("MutatedSettled");
    const priorCapsule = await committedCapsule(harness.store);
    expect(await harness.undo.undo()).toEqual({
      kind: "RestoredAndCleared",
      synchronization: { kind: "Released" },
    });

    const admitted = await harness.writer.begin({
      owner: priorCapsule.capsule.owner,
      ownerProtocolVersion: priorCapsule.capsule.ownerProtocolVersion,
      contentAuthority: priorCapsule.capsule.contentAuthority,
      targets: priorCapsule.capsule.targets,
      actions: priorCapsule.capsule.actions.map(({ action }) => Object.freeze({ action })),
    });
    if (admitted.kind !== "Accepted") throw new Error(`real action admission failed: ${admitted.failure.message}`);
    expect(await admitted.session.stage({
      actionHandle: admitted.admittedActions[0]!.actionHandle,
    })).toMatchObject({ kind: "Accepted" });
    await admitted.session.suspend();

    const coldWriter = new CapsuleControllerWriterV1({
      store: harness.store,
      registry: harness.registry,
    });
    expect(await coldWriter.recoverApplying()).toEqual({
      kind: "RecoveredToPriorIdle",
      synchronization: { kind: "Released" },
    });
    expect((await state(harness.store)).body.state).toEqual({ kind: "idle", committed: null });
  });

  it("keeps a forward mutation applying when its operation-bound observation was not persisted", async () => {
    const harness = createHarness();
    const fixture = exportArtifactFixture();
    const destination = await destinationAt(root, "applied-recovery");
    const productionWriter = createExportUndoWriterV1(harness.writer);
    let rejectFirstMark = true;
    const interruptedWriter: UndoWriter = {
      preflight: (input) => productionWriter.preflight(input),
      async begin(input) {
        const admitted = await productionWriter.begin(input);
        if (admitted.kind !== "Accepted") return admitted;
        return Object.freeze({
          ...admitted,
          session: Object.freeze({
            ...admitted.session,
            async markApplied(markInput: Parameters<UndoApplyingSession["markApplied"]>[0]) {
              if (rejectFirstMark) {
                rejectFirstMark = false;
                return Object.freeze({
                  kind: "Rejected" as const,
                  failure: Object.freeze({
                    code: "StatePublicationFailed",
                    phase: "test-mark-applied",
                    message: "injected observed-post persistence interruption",
                  }),
                });
              }
              return admitted.session.markApplied(markInput);
            },
          }),
        });
      },
    };
    const client = clientForUndoWriter(interruptedWriter, fixture.alpha);

    expect(await client.exports.apply(request(fixture.alpha.ref, [destination], "targeted-release")))
      .toMatchObject({ kind: "MutatedUnsettled" });
    expect((await state(harness.store)).body.state.kind).toBe("applying");

    const coldWriter = new CapsuleControllerWriterV1({
      store: harness.store,
      registry: harness.registry,
    });
    expect(await coldWriter.recoverApplying()).toMatchObject({
      kind: "ApplyingUnsettled",
      failure: { code: "ReplayBlocked" },
    });
    expect((await state(harness.store)).body.state.kind).toBe("applying");
  });

  it("does not adopt a same-mode same-byte foreign file as an applied operation identity", async () => {
    const harness = createHarness();
    const fixture = exportArtifactFixture();
    const destination = await destinationAt(root, "foreign-same-bytes");
    const client = clientFor(harness.writer, fixture.alpha);
    expect((await client.exports.apply(request(fixture.alpha.ref, [destination], "targeted-release"))).kind)
      .toBe("MutatedSettled");
    const priorCapsule = await committedCapsule(harness.store);
    expect(await harness.undo.undo()).toEqual({
      kind: "RestoredAndCleared",
      synchronization: { kind: "Released" },
    });
    const action = priorCapsule.capsule.actions
      .map(({ action: encoded }) => parseExportOwnerAction(encoded))
      .find(({ mutation }) => mutation === "write-payload");
    if (action === undefined || action.expectedPost.kind !== "Present") {
      throw new Error("fixture capsule lacks its expected payload-write action");
    }
    const foreignPath = join(destination, action.relativePath);
    await mkdir(dirname(foreignPath), { recursive: true });
    await writeFile(foreignPath, Buffer.from(action.expectedPost.bytesBase64, "base64"));
    await chmod(foreignPath, action.expectedPost.mode);

    const registration = createExportOwnerProtocolRegistrationV1();
    expect(await registration.applyingRecovery.classifyStaged({
      action,
      targets: priorCapsule.capsule.targets,
    })).toMatchObject({
      kind: "Ambiguous",
      failure: { code: "ReplayBlocked" },
    });
    expect(Number((await lstat(foreignPath, { bigint: true })).mode & 0o777n)).toBe(action.expectedPost.mode);
    await expect(readFile(foreignPath)).resolves.toEqual(Buffer.from(action.expectedPost.bytesBase64, "base64"));
  });

  it("keeps staged recovery unsettled when a foreign state matches neither transition endpoint", async () => {
    const harness = createHarness();
    const fixture = exportArtifactFixture();
    const destination = await destinationAt(root, "ambiguous-recovery");
    const client = clientFor(harness.writer, fixture.alpha);
    expect((await client.exports.apply(request(fixture.alpha.ref, [destination], "targeted-release"))).kind)
      .toBe("MutatedSettled");
    const priorCapsule = await committedCapsule(harness.store);
    expect(await harness.undo.undo()).toEqual({
      kind: "RestoredAndCleared",
      synchronization: { kind: "Released" },
    });

    const admitted = await harness.writer.begin({
      owner: priorCapsule.capsule.owner,
      ownerProtocolVersion: priorCapsule.capsule.ownerProtocolVersion,
      contentAuthority: priorCapsule.capsule.contentAuthority,
      targets: priorCapsule.capsule.targets,
      actions: priorCapsule.capsule.actions.map(({ action }) => Object.freeze({ action })),
    });
    if (admitted.kind !== "Accepted") throw new Error(`real action admission failed: ${admitted.failure.message}`);
    expect(await admitted.session.stage({
      actionHandle: admitted.admittedActions[0]!.actionHandle,
    })).toMatchObject({ kind: "Accepted" });
    const firstAction = parseExportOwnerAction(priorCapsule.capsule.actions[0]!.action);
    if (firstAction.expectedPost.kind !== "Directory") {
      throw new Error("fixture plan no longer begins with its directory-creation frontier");
    }
    await writeFile(join(destination, firstAction.relativePath), "foreign-state\n", { mode: 0o644 });
    await admitted.session.suspend();

    const coldWriter = new CapsuleControllerWriterV1({
      store: harness.store,
      registry: harness.registry,
    });
    expect(await coldWriter.recoverApplying()).toMatchObject({
      kind: "ApplyingUnsettled",
      failure: { code: "ReplayBlocked" },
    });
    expect((await state(harness.store)).body.state.kind).toBe("applying");
  });

  it("cold-resumes replay after restoration wins but outcome persistence fails", async () => {
    const store = new InMemoryCapsuleStateStoreV1(createInitialCapsuleState());
    const base = createExportOwnerProtocolRegistrationV1();
    let injectAfterRestore = true;
    const wrapped: OwnerProtocolRegistrationV1 = {
      codec: base.codec,
      applyingRecovery: base.applyingRecovery,
      replay: {
        ...base.replay,
        async restore(input) {
          const result = await base.replay.restore(input);
          if (injectAfterRestore && result.kind === "Restored") {
            injectAfterRestore = false;
            store.injectNextFailure({
              code: "StatePublicationFailed",
              phase: "test-replay-persist",
              message: "injected post-restoration CAS failure",
            });
          }
          return result;
        },
      },
    };
    const registry = new ClosedOwnerProtocolRegistryV1([wrapped]);
    const writer = new CapsuleControllerWriterV1({ store, registry });
    const firstUndo = new CapsuleUndoControllerV1({ store, registry });
    const fixture = exportArtifactFixture();
    const destination = await destinationAt(root, "cold-replay");
    const client = clientFor(writer, fixture.alpha);
    expect((await client.exports.apply(request(fixture.alpha.ref, [destination], "targeted-release"))).kind)
      .toBe("MutatedSettled");

    expect(await firstUndo.undo()).toMatchObject({
      kind: "ReplayUnsettled",
      failure: { code: "StatePublicationFailed" },
    });
    expect((await state(store)).body.state.kind).toBe("undoing");

    const coldUndo = new CapsuleUndoControllerV1({ store, registry });
    expect(await coldUndo.undo()).toEqual({
      kind: "RestoredAndCleared",
      synchronization: { kind: "Released" },
    });
    await expect(lstat(join(destination, EXPORT_LEDGER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(destination, "codex"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});

function createHarness() {
  const store = new InMemoryCapsuleStateStoreV1(createInitialCapsuleState());
  const registry = new ClosedOwnerProtocolRegistryV1([
    createExportOwnerProtocolRegistrationV1(),
  ]);
  const writer = new CapsuleControllerWriterV1({ store, registry });
  const undo = new CapsuleUndoControllerV1({ store, registry });
  return { store, registry, writer, undo };
}

function clientFor(
  writer: CapsuleControllerWriterV1,
  artifact: ReturnType<typeof exportArtifactFixture>["alpha" | "complete"],
) {
  return clientForUndoWriter(createExportUndoWriterV1(writer), artifact);
}

function clientForUndoWriter(
  undoWriter: UndoWriter,
  artifact: ReturnType<typeof exportArtifactFixture>["alpha" | "complete"],
) {
  const artifacts = new FakeArtifactReader();
  artifacts.add(artifact);
  return createExportTestClient({
    artifactReader: artifacts,
    knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
    undoWriter,
  });
}

function request(
  artifactRef: ExportAgentPluginsRequest["artifactRef"],
  destinations: readonly string[],
  mode: ExportAgentPluginsRequest["mode"] = "complete-set",
  overwritePolicy: ExportAgentPluginsRequest["overwritePolicy"] = "managed-only",
): ExportAgentPluginsRequest {
  return Object.freeze({
    protocolVersion: EXPORT_APPLICATION_PROTOCOL_VERSION,
    artifactRef,
    mode,
    layout: "codex-v1",
    destinations,
    overwritePolicy,
  });
}

function identityTuple(stat: BigIntStats): readonly [bigint, bigint, bigint] {
  return [stat.dev, stat.ino, stat.mtimeNs];
}

async function destinationAt(fixtureRoot: OwnedFixtureRoot, name: string): Promise<string> {
  const destination = join(fixtureRoot.path, name);
  await mkdir(destination);
  return destination;
}

async function state(store: InMemoryCapsuleStateStoreV1) {
  const read = await store.read();
  if (read.kind !== "Observed") throw new Error(read.failure.message);
  return read.observation.state;
}

async function stateBytes(store: InMemoryCapsuleStateStoreV1): Promise<Uint8Array> {
  const read = await store.read();
  if (read.kind !== "Observed") throw new Error(read.failure.message);
  return read.observation.bytes;
}

async function committedCapsule(store: InMemoryCapsuleStateStoreV1) {
  const observed = await state(store);
  if (observed.body.state.kind !== "idle" || observed.body.state.committed === null) {
    throw new Error("expected one committed production export capsule");
  }
  return observed.body.state.committed;
}
