import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  EXPORT_APPLICATION_PROTOCOL_VERSION,
  type ExportAgentPluginsRequest,
  type ExportAgentPluginsResult,
  type UndoCandidateInput,
  type UndoWriter,
} from "@rawr/agent-plugin-lifecycle/bindings/exports";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import { afterEach, describe, expect, it } from "vitest";

import { deriveAgentPluginControllerLayout } from "../../../src/lib/agent-plugins/layout";
import {
  canonicalJsonBytes,
  capsuleStateDigest,
  committedCapsuleDigest,
} from "../../../src/lib/agent-plugins/undo/canonical";
import {
  createInitialCapsuleState,
  createAgentPluginOwnerProtocolRegistryV1,
  openNodeCapsuleStateStoreV1,
} from "../../../src/lib/agent-plugins/undo";
import type { CapsuleAdvisoryLockV1 } from "../../../src/lib/agent-plugins/undo/advisory-lock";
import {
  openExistingRawCapsuleSlotV1,
  type RawCapsuleSlotSessionV1,
} from "../../../src/lib/agent-plugins/undo/node-store";
import { prepareExportOnlyCapsuleSlotV1 } from "../../../src/lib/agent-plugins/undo/legacy-provider-retirement";
import { createNodeExportUndoWriter } from "../../../src/lib/agent-plugins/service-runtime/client";
import {
  createNodeProviderLifecycleDeps,
  createNodeProviderRecordState,
} from "../../../src/lib/agent-plugins/service-runtime/providers/node-runtime";
import { undoAgentPluginCapsuleAtDataRoot } from "../../../src/lib/agent-plugins/service-runtime/undo";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../../../../services/agent-plugin-lifecycle/test/support/client";
import { exportArtifactFixture } from "../../../../../services/agent-plugin-lifecycle/test/modules/exports/artifact-fixture";
import {
  createExportTestClient,
  FakeArtifactReader,
  FakeKnownNativeHomesReader,
  knownHomes,
} from "../undo/export-runtime-fixture";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./releases/owned-fixture-root";

const LEGACY_FIXTURE_SHA256 = "363916da3fef00eb3298d430db5b7aa065c9564682242a863cb6810e2abce9ac";

describe("production lifecycle capsule boundary", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it("keeps provider inspection capsule-cold even when the retired slot is malformed", async () => {
    fixture = await createOwnedFixtureRoot();
    const dataRoot = path.join(fixture.path, "controller-data");
    await mkdir(dataRoot);
    const layout = deriveAgentPluginControllerLayout({ dataRoot });
    const malformed = nonCanonicalLegacyFixture(await legacyFixtureBytes());
    await seedCapsule(layout.capsuleRoot, malformed);
    const providerState = createNodeProviderRecordState({
      controllerDataRoot: dataRoot,
      providerProjectionRoot: layout.providerProjectionRoot,
      providerTargetStateRoot: layout.providerTargetStateRoot,
    });
    const providerExecutables = Object.freeze({});
    const providerDeps = createNodeProviderLifecycleDeps({
      state: providerState,
      providerExecutables,
    });
    expect(Object.isFrozen(providerDeps)).toBe(true);
    expect(Reflect.ownKeys(providerDeps)).toEqual([
      "providerRecords",
      "providerNativeResource",
      "providerExecutables",
      "providerProjectionRepositoryRoot",
    ]);
    expect(providerDeps.providerRecords).toBe(providerState.records);
    expect(providerDeps.providerExecutables).toBe(providerExecutables);
    expect(providerState).not.toHaveProperty("artifactRepository");
    const anchor = Object.freeze({
      root: path.join(fixture.path, "content"),
      rootDevice: "16777234",
      rootInode: "101",
      refName: "refs/heads/main",
      commit: "a".repeat(40),
      refCommit: "a".repeat(40),
      tree: "b".repeat(40),
      objectFormat: "sha1" as const,
      remoteUrls: Object.freeze(["git:github.com/example/personal-rawr-hq"]),
    });
    const dirtyStatus = new TextEncoder().encode("? fixture-dirty\0");
    const client = createLifecycleTestClient({
      ...providerDeps,
      artifactRepository: makeNodeArtifactRepositoryAsyncPort(),
      artifactRepositoryRoot: layout.artifactStoreRoot,
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        inspectGitWorkspace: async () => anchor,
        captureGitWorkspaceEvidence: async () => ({
          openingAnchor: anchor,
          openingStatus: dirtyStatus,
          openingTrackedFlags: new Uint8Array(),
          worktreeObjectIds: [],
          indexEntries: new Uint8Array(),
          closingAnchor: anchor,
          closingStatus: dirtyStatus,
          closingTrackedFlags: new Uint8Array(),
        }),
      },
    });

    const result = await client.providers.canonicalStatus({
      kind: "canonical-status",
      channel: "current-main",
      locator: {
        repositoryIdentity: "git:github.com/example/personal-rawr-hq",
        workspaceRoot: path.join(fixture.path, "content"),
      },
      targets: [{ provider: "codex", home: path.join(fixture.path, "codex-home") }],
    }, testInvocation);

    expect(result.ok && result.value[0]?.status).toBe("BLOCKED_SELECTION");
    expect(await capsuleBytes(layout.capsuleRoot)).toEqual(malformed);
  });

  it("reports an absent export capsule without creating controller metadata", async () => {
    fixture = await createOwnedFixtureRoot();
    const dataRoot = path.join(fixture.path, "controller-data");
    await mkdir(dataRoot);
    const before = await readFileTree(dataRoot);

    expect(await undoAgentPluginCapsuleAtDataRoot(dataRoot)).toEqual({
      kind: "NoCommittedCapsule",
      synchronization: { kind: "NotAcquired" },
    });
    expect(await readFileTree(dataRoot)).toEqual(before);
  });

  it.runIf("Bun" in globalThis)(
    "retires the exact landed idle provider capsule only at first export activation",
    async () => {
      fixture = await createOwnedFixtureRoot();
      const dataRoot = path.join(fixture.path, "controller-data");
      const destination = path.join(fixture.path, "export-destination");
      await Promise.all([mkdir(dataRoot), mkdir(destination)]);
      const layout = deriveAgentPluginControllerLayout({ dataRoot });
      const legacy = await legacyFixtureBytes();
      expect(sha256(legacy)).toBe(LEGACY_FIXTURE_SHA256);
      await seedCapsule(layout.capsuleRoot, legacy);
      const candidate = await captureExportCandidate(destination);

      expect(await createNodeExportUndoWriter(layout.capsuleRoot).preflight(candidate))
        .toEqual({ kind: "Accepted" });

      const registry = createAgentPluginOwnerProtocolRegistryV1();
      const opened = await openNodeCapsuleStateStoreV1({ root: layout.capsuleRoot, registry });
      if (opened.kind === "Rejected") throw new Error(opened.failure.message);
      const observed = await opened.store.read();
      if (observed.kind === "Rejected") throw new Error(observed.failure.message);
      expect(observed.observation.state.body.state).toEqual({ kind: "idle", committed: null });
      expect(observed.observation.bytes).not.toEqual(legacy);
      const migrated = observed.observation.bytes;

      expect(await createNodeExportUndoWriter(layout.capsuleRoot).preflight(candidate))
        .toEqual({ kind: "Accepted" });
      expect(await capsuleBytes(layout.capsuleRoot)).toEqual(migrated);
    },
  );

  it.runIf("Bun" in globalThis)(
    "classifies the exact idle provider capsule as non-replayable without changing bytes",
    async () => {
      fixture = await createOwnedFixtureRoot();
      const dataRoot = path.join(fixture.path, "controller-data");
      await mkdir(dataRoot);
      const layout = deriveAgentPluginControllerLayout({ dataRoot });
      const legacy = await legacyFixtureBytes();
      await seedCapsule(layout.capsuleRoot, legacy);

      expect(await undoAgentPluginCapsuleAtDataRoot(dataRoot)).toEqual({
        kind: "RejectedBeforeReplay",
        failure: {
          code: "UnknownOwnerProtocol",
          phase: "undo-owner",
          message: "Retired provider lifecycle capsules are non-replayable",
        },
        synchronization: { kind: "Released" },
      });
      expect(await capsuleBytes(layout.capsuleRoot)).toEqual(legacy);
    },
  );

  it("rejects a raw retirement CAS when the locked state bytes change", async () => {
    fixture = await createOwnedFixtureRoot();
    const dataRoot = path.join(fixture.path, "controller-data");
    const destination = path.join(fixture.path, "export-destination");
    await Promise.all([mkdir(dataRoot), mkdir(destination)]);
    const layout = deriveAgentPluginControllerLayout({ dataRoot });
    const legacy = await legacyFixtureBytes();
    const changed = corruptLegacyStateDigest(legacy);
    await seedCapsule(layout.capsuleRoot, legacy);
    const opened = await openExistingRawCapsuleSlotV1({
      root: layout.capsuleRoot,
      registry: createAgentPluginOwnerProtocolRegistryV1(),
      advisoryLock: createInProcessAdvisoryLock(),
    });
    if (opened.kind !== "Acquired") {
      throw new Error(opened.kind === "Rejected" ? opened.failure.message : "legacy slot unexpectedly absent");
    }
    try {
      const observed = await opened.session.read();
      if (observed.kind === "Rejected") throw new Error(observed.failure.message);
      await writeFile(path.join(layout.capsuleRoot, "capsule-state-v1.json"), changed, { mode: 0o600 });

      expect(await opened.session.compareAndSet({
        expectedBytes: observed.observation.bytes,
        nextState: createInitialCapsuleState(),
      })).toMatchObject({
        kind: "Rejected",
        failure: { code: "StateChanged", phase: "raw-slot-compare-and-set" },
      });
    } finally {
      await opened.session.release();
    }
    expect(await capsuleBytes(layout.capsuleRoot)).toEqual(changed);
    expect((await readdir(layout.capsuleRoot)).sort()).toEqual([
      ".capsule-admission-v1.lock",
      "capsule-state-v1.json",
    ]);

    await writeFile(path.join(layout.capsuleRoot, "capsule-state-v1.json"), legacy, { mode: 0o600 });
    let providerAccesses = 0;
    let exportAdmissions = 0;
    let racedPublications = 0;
    const retirementWriter = createPreparationOnlyUndoWriter(layout.capsuleRoot, {
      advisoryLock: createInProcessAdvisoryLock(),
      failpoints: {
        async beforeStatePublication() {
          racedPublications += 1;
          await writeFile(path.join(layout.capsuleRoot, "capsule-state-v1.json"), changed, { mode: 0o600 });
        },
      },
    });
    const observedWriter = observeUndoAdmission(retirementWriter, () => {
      exportAdmissions += 1;
    });
    const result = await applyExport(destination, observedWriter, () => {
      providerAccesses += 1;
    });
    expect(result).toMatchObject({
      kind: "RejectedBeforeMutation",
      failure: {
        code: "UndoAdmissionFailed",
        phase: "undo-preflight",
        message: expect.stringContaining("capsule state changed during legacy retirement"),
      },
    });
    expect(racedPublications).toBe(1);
    expect(exportAdmissions).toBe(0);
    expect(providerAccesses).toBe(0);
    expect(await readFileTree(destination)).toEqual([]);
    expect(await capsuleBytes(layout.capsuleRoot)).toEqual(changed);
  });

  it("fails closed on an unknown post-publication outcome and converges on cold retry", async () => {
    fixture = await createOwnedFixtureRoot();
    const dataRoot = path.join(fixture.path, "controller-data");
    const destination = path.join(fixture.path, "export-destination");
    await Promise.all([mkdir(dataRoot), mkdir(destination)]);
    const layout = deriveAgentPluginControllerLayout({ dataRoot });
    const legacy = await legacyFixtureBytes();
    await seedCapsule(layout.capsuleRoot, legacy);
    const advisoryLock = createInProcessAdvisoryLock();
    let publications = 0;
    let providerAccesses = 0;
    let exportAdmissions = 0;
    const destinationBefore = await readFileTree(destination);

    const retirementWriter = createPreparationOnlyUndoWriter(layout.capsuleRoot, {
      advisoryLock,
      failpoints: {
        afterStatePublication() {
          publications += 1;
          throw new Error("injected post-publication uncertainty");
        },
      },
    });
    const observedWriter = observeUndoAdmission(retirementWriter, () => {
      exportAdmissions += 1;
    });
    const result = await applyExport(destination, observedWriter, () => {
      providerAccesses += 1;
    });
    expect(result).toMatchObject({
      kind: "RejectedBeforeMutation",
      failure: {
        code: "UndoAdmissionFailed",
        phase: "undo-preflight",
        message: expect.stringContaining("legacy provider capsule retirement is unsettled"),
      },
    });
    expect(publications).toBe(1);
    expect(exportAdmissions).toBe(0);
    expect(providerAccesses).toBe(0);
    expect(await readFileTree(destination)).toEqual(destinationBefore);
    const unknownCommit = await capsuleBytes(layout.capsuleRoot);
    expect(unknownCommit).not.toEqual(legacy);

    expect(await prepareExportOnlyCapsuleSlotV1({
      capsuleRoot: layout.capsuleRoot,
      mode: "export-activation",
    }, { advisoryLock: createInProcessAdvisoryLock() })).toEqual({ kind: "Ready" });
    expect(await capsuleBytes(layout.capsuleRoot)).toEqual(unknownCommit);
  });

  it("does not return export readiness when raw-session release fails", async () => {
    fixture = await createOwnedFixtureRoot();
    const legacy = await legacyFixtureBytes();
    const destination = path.join(fixture.path, "export-destination");
    await mkdir(destination);
    const layout = deriveAgentPluginControllerLayout({
      dataRoot: path.join(fixture.path, "controller-data"),
    });
    let casCalls = 0;
    let providerAccesses = 0;
    let exportAdmissions = 0;
    const releaseFailingOpener: typeof openExistingRawCapsuleSlotV1 = async () => Object.freeze({
      kind: "Acquired",
      session: Object.freeze({
        read: async () => Object.freeze({
          kind: "Observed",
          observation: Object.freeze({ bytes: legacy }),
        }),
        compareAndSet: async (
          input: Parameters<RawCapsuleSlotSessionV1["compareAndSet"]>[0],
        ) => {
          casCalls += 1;
          return Object.freeze({
            kind: "Committed",
            observation: Object.freeze({
              state: input.nextState,
              bytes: canonicalJsonBytes(input.nextState),
            }),
          });
        },
        release: async () => {
          throw new Error("injected raw-session release failure");
        },
      }),
    });

    const retirementWriter = createPreparationOnlyUndoWriter(
      layout.capsuleRoot,
      { openExistingRawSlot: releaseFailingOpener },
    );
    const observedWriter = observeUndoAdmission(retirementWriter, () => {
      exportAdmissions += 1;
    });
    const result = await applyExport(destination, observedWriter, () => {
      providerAccesses += 1;
    });
    expect(result).toMatchObject({
      kind: "RejectedBeforeMutation",
      failure: {
        code: "UndoAdmissionFailed",
        phase: "undo-preflight",
        message: expect.stringContaining("Capsule admission release failed after export-only activation"),
      },
    });
    expect(casCalls).toBe(1);
    expect(exportAdmissions).toBe(0);
    expect(providerAccesses).toBe(0);
    expect(await readFileTree(destination)).toEqual([]);
  });

  it.runIf("Bun" in globalThis)(
    "refuses every invalid legacy state before export or native provider access",
    async () => {
      fixture = await createOwnedFixtureRoot();
      const legacy = await legacyFixtureBytes();
      for (const [name, bytes] of [
        ["invalid-json", invalidJsonLegacyFixture()],
        ["noncanonical", nonCanonicalLegacyFixture(legacy)],
        ["invalid-envelope", invalidEnvelopeLegacyFixture(legacy)],
        ["digest-corruption", corruptLegacyStateDigest(legacy)],
        ["stored-action-digest-corruption", corruptStoredActionDigest(legacy)],
        ["committed-capsule-digest-corruption", corruptCommittedCapsuleDigest(legacy)],
        ["non-idle", nonIdleLegacyFixture(legacy)],
        ["undoing", undoingLegacyFixture(legacy)],
        ["wrong-owner", legacyFixtureWithOwner(legacy, "some-other-owner")],
        ["wrong-owner-version", legacyFixtureWithOwnerProtocol(legacy, 2)],
      ] as const) {
        const dataRoot = path.join(fixture.path, `${name}-controller-data`);
        const destination = path.join(fixture.path, `${name}-export-destination`);
        await Promise.all([mkdir(dataRoot), mkdir(destination)]);
        const layout = deriveAgentPluginControllerLayout({ dataRoot });
        await seedCapsule(layout.capsuleRoot, bytes);
        const destinationBefore = await readFileTree(destination);
        let providerAccesses = 0;
        let exportAdmissions = 0;

        expect(await applyExport(
          destination,
          observeUndoAdmission(createNodeExportUndoWriter(layout.capsuleRoot), () => {
            exportAdmissions += 1;
          }),
          () => {
            providerAccesses += 1;
          },
        )).toMatchObject({
          kind: "RejectedBeforeMutation",
          failure: { code: "UndoAdmissionFailed", phase: "undo-preflight" },
        });
        expect(exportAdmissions).toBe(0);
        expect(providerAccesses).toBe(0);
        expect(await readFileTree(destination)).toEqual(destinationBefore);
        expect(await capsuleBytes(layout.capsuleRoot)).toEqual(bytes);
        await expect(undoAgentPluginCapsuleAtDataRoot(dataRoot))
          .rejects.toThrow("neither export-owned nor an exact idle provider-v1 capsule");
        expect(await capsuleBytes(layout.capsuleRoot)).toEqual(bytes);
      }
    },
  );
});

async function applyExport(
  destination: string,
  undoWriter: UndoWriter,
  onProviderAccess: (label: string) => void,
): Promise<ExportAgentPluginsResult> {
  const artifact = exportArtifactFixture().alpha;
  const artifacts = new FakeArtifactReader();
  artifacts.add(artifact);
  const client = createExportTestClient({
    artifactReader: artifacts,
    knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
    undoWriter,
  }, { onProviderAccess });
  return client.exports.apply(exportRequest(artifact.ref, destination));
}

function createPreparationOnlyUndoWriter(
  capsuleRoot: Parameters<typeof prepareExportOnlyCapsuleSlotV1>[0]["capsuleRoot"],
  options: Parameters<typeof prepareExportOnlyCapsuleSlotV1>[1],
): UndoWriter {
  return Object.freeze({
    async preflight() {
      await prepareExportOnlyCapsuleSlotV1({ capsuleRoot, mode: "export-activation" }, options);
      return Object.freeze({ kind: "Accepted" as const });
    },
    async begin(): Promise<never> {
      throw new Error("Preparation-only fixture must reject before export admission");
    },
  });
}

function observeUndoAdmission(
  writer: UndoWriter,
  onBegin: () => void,
): UndoWriter {
  return Object.freeze({
    preflight: (input: Parameters<UndoWriter["preflight"]>[0]) => writer.preflight(input),
    begin(input: Parameters<UndoWriter["begin"]>[0]) {
      onBegin();
      return writer.begin(input);
    },
  });
}

async function captureExportCandidate(destination: string): Promise<UndoCandidateInput> {
  const artifact = exportArtifactFixture().alpha;
  const artifacts = new FakeArtifactReader();
  artifacts.add(artifact);
  let candidate: UndoCandidateInput | undefined;
  const captureWriter: UndoWriter = Object.freeze({
    async preflight(input: UndoCandidateInput) {
      candidate = input;
      return Object.freeze({
        kind: "Rejected" as const,
        failure: Object.freeze({
          code: "FixtureCapture",
          phase: "fixture-capture",
          message: "capture export candidate without mutation",
        }),
      });
    },
    async begin(): Promise<never> {
      throw new Error("capture writer must reject before export admission");
    },
  });
  const client = createExportTestClient({
    artifactReader: artifacts,
    knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
    undoWriter: captureWriter,
  });
  await client.exports.apply(exportRequest(artifact.ref, destination));
  if (candidate === undefined) throw new Error("export candidate capture did not reach preflight");
  return candidate;
}

function exportRequest(
  artifactRef: ExportAgentPluginsRequest["artifactRef"],
  destination: string,
): ExportAgentPluginsRequest {
  return Object.freeze({
    protocolVersion: EXPORT_APPLICATION_PROTOCOL_VERSION,
    artifactRef,
    mode: "targeted-release",
    layout: "codex-v1",
    destinations: Object.freeze([destination]),
    overwritePolicy: "managed-only",
  });
}

async function seedCapsule(capsuleRoot: string, bytes: Uint8Array): Promise<void> {
  await mkdir(capsuleRoot, { recursive: true, mode: 0o700 });
  await writeFile(path.join(capsuleRoot, ".capsule-admission-v1.lock"), "", { mode: 0o600 });
  await writeFile(path.join(capsuleRoot, "capsule-state-v1.json"), bytes, { mode: 0o600 });
}

async function legacyFixtureBytes(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(new URL("../undo/fixtures/legacy-provider-idle-committed-v1.json", import.meta.url)));
}

function invalidJsonLegacyFixture(): Uint8Array {
  return new TextEncoder().encode("{\n");
}

function nonCanonicalLegacyFixture(bytes: Uint8Array): Uint8Array {
  return new TextEncoder().encode(` ${new TextDecoder().decode(bytes)}`);
}

function invalidEnvelopeLegacyFixture(bytes: Uint8Array): Uint8Array {
  const envelope = requireRecord(JSON.parse(new TextDecoder().decode(bytes)));
  return canonicalJsonBytes(Object.freeze({ ...envelope, unexpected: true }));
}

function corruptLegacyStateDigest(bytes: Uint8Array): Uint8Array {
  const envelope = requireRecord(JSON.parse(new TextDecoder().decode(bytes)));
  return canonicalJsonBytes(Object.freeze({
    ...envelope,
    stateDigest: `cs1_${"0".repeat(64)}`,
  }));
}

function corruptStoredActionDigest(bytes: Uint8Array): Uint8Array {
  const envelope = requireRecord(JSON.parse(new TextDecoder().decode(bytes)));
  const body = requireRecord(envelope.body);
  const state = requireRecord(body.state);
  const committed = requireRecord(state.committed);
  const capsule = requireRecord(committed.capsule);
  if (!Array.isArray(capsule.actions) || capsule.actions.length === 0) {
    throw new Error("fixture capsule has no stored action");
  }
  const [firstAction, ...remainingActions] = capsule.actions;
  const nextCapsule = Object.freeze({
    ...capsule,
    actions: Object.freeze([
      Object.freeze({
        ...requireRecord(firstAction),
        actionDigest: `ca1_${"0".repeat(64)}`,
      }),
      ...remainingActions,
    ]),
  });
  const nextBody = Object.freeze({
    ...body,
    state: Object.freeze({
      ...state,
      committed: Object.freeze({
        ...committed,
        capsule: nextCapsule,
        capsuleDigest: committedCapsuleDigest(nextCapsule),
      }),
    }),
  });
  return sealLegacyEnvelope(envelope, nextBody);
}

function corruptCommittedCapsuleDigest(bytes: Uint8Array): Uint8Array {
  const envelope = requireRecord(JSON.parse(new TextDecoder().decode(bytes)));
  const body = requireRecord(envelope.body);
  const state = requireRecord(body.state);
  const committed = requireRecord(state.committed);
  const nextBody = Object.freeze({
    ...body,
    state: Object.freeze({
      ...state,
      committed: Object.freeze({
        ...committed,
        capsuleDigest: `cc1_${"0".repeat(64)}`,
      }),
    }),
  });
  return sealLegacyEnvelope(envelope, nextBody);
}

function sealLegacyEnvelope(
  envelope: Readonly<Record<string, unknown>>,
  body: Readonly<Record<string, unknown>>,
): Uint8Array {
  return canonicalJsonBytes(Object.freeze({
    body,
    protocolVersion: envelope.protocolVersion,
    stateDigest: capsuleStateDigest(body),
  }));
}

function nonIdleLegacyFixture(bytes: Uint8Array): Uint8Array {
  const envelope = requireRecord(JSON.parse(new TextDecoder().decode(bytes)));
  const body = requireRecord(envelope.body);
  const state = requireRecord(body.state);
  const nextBody = Object.freeze({
    generation: body.generation,
    state: Object.freeze({ committed: state.committed, kind: "applying" }),
  });
  return canonicalJsonBytes(Object.freeze({
    body: nextBody,
    protocolVersion: 1,
    stateDigest: capsuleStateDigest(nextBody),
  }));
}

function undoingLegacyFixture(bytes: Uint8Array): Uint8Array {
  const envelope = requireRecord(JSON.parse(new TextDecoder().decode(bytes)));
  const body = requireRecord(envelope.body);
  const state = requireRecord(body.state);
  const nextBody = Object.freeze({
    generation: body.generation,
    state: Object.freeze({
      kind: "undoing",
      committed: state.committed,
      token: `ct1_${"2".repeat(64)}`,
      outcomes: Object.freeze([{ kind: "Pending" }]),
      verificationFailure: null,
    }),
  });
  return canonicalJsonBytes(Object.freeze({
    body: nextBody,
    protocolVersion: 1,
    stateDigest: capsuleStateDigest(nextBody),
  }));
}

function legacyFixtureWithOwner(bytes: Uint8Array, owner: string): Uint8Array {
  return rewriteLegacyCapsule(bytes, Object.freeze({ owner }));
}

function legacyFixtureWithOwnerProtocol(bytes: Uint8Array, ownerProtocolVersion: number): Uint8Array {
  return rewriteLegacyCapsule(bytes, Object.freeze({ ownerProtocolVersion }));
}

function rewriteLegacyCapsule(
  bytes: Uint8Array,
  patch: Readonly<Record<string, unknown>>,
): Uint8Array {
  const envelope = requireRecord(JSON.parse(new TextDecoder().decode(bytes)));
  const body = requireRecord(envelope.body);
  const state = requireRecord(body.state);
  const committed = requireRecord(state.committed);
  const capsule = requireRecord(committed.capsule);
  const nextCapsule = Object.freeze({ ...capsule, ...patch });
  const nextCommitted = Object.freeze({
    capsule: nextCapsule,
    capsuleDigest: committedCapsuleDigest(nextCapsule),
  });
  const nextBody = Object.freeze({
    generation: body.generation,
    state: Object.freeze({ committed: nextCommitted, kind: state.kind }),
  });
  return canonicalJsonBytes(Object.freeze({
    body: nextBody,
    protocolVersion: envelope.protocolVersion,
    stateDigest: capsuleStateDigest(nextBody),
  }));
}

async function capsuleBytes(capsuleRoot: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path.join(capsuleRoot, "capsule-state-v1.json")));
}

async function readFileTree(root: string): Promise<readonly string[]> {
  return (await readdir(root, { recursive: true })).sort();
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) {
    throw new Error("fixture value is not an object");
  }
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createInProcessAdvisoryLock(): CapsuleAdvisoryLockV1 {
  let held = false;
  return Object.freeze({
    platform: "darwin",
    async acquire() {
      if (held) return Object.freeze({ kind: "Busy" as const });
      held = true;
      return Object.freeze({ kind: "Acquired" as const });
    },
    async release() {
      if (!held) return Object.freeze({ kind: "Failed" as const, reason: "test lock was not held" });
      held = false;
      return Object.freeze({ kind: "Released" as const });
    },
  });
}
