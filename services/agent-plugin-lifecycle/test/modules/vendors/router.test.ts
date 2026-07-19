import { createHash } from "node:crypto";

import type {
  ContentTreeEntry,
  ContentWorkspaceAsyncPort,
  ContentWorkspaceFailure,
  ContentWorkspaceIdentity,
  ContentWorkspaceWrite,
  MaterializedContentTreeEntry,
  MaterializedRemoteContentTree,
  RemoteContentTree,
} from "@rawr/resource-content-workspace";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";

import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
  type VendorLockRecord,
  type VendorProvenanceRecord,
  type VendorSourceDeclaration,
  type VendorSourceIdentity,
} from "../../../src/service/modules/vendors/model/dto/vendor-records";
import type { Client } from "../../../src/client";
import {
  encodeVendorLockRecord,
  encodeVendorProvenanceRecord,
  encodeVendorSourceDeclaration,
  vendorPayloadDigest,
} from "../../../src/service/modules/vendors/model/policy/vendor-record-codec";
import { vendorIssue } from "../../../src/service/modules/vendors/model/policy/vendor-policy-result";
import {
  VendorStatusResultSchema,
  VendorUpdateResultSchema,
} from "../../../src/service/modules/vendors/schemas";
import {
  canonicalSerializeAgentPluginReleaseInput,
  contentDigest,
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
  type ReleaseResult,
} from "../../../src/service/shared/release";
import { createLifecycleTestClient, testInvocation } from "../../support/client";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const observedAt = "2026-07-17T18:20:30.123Z";
const sourceId = "upstream";
const declarationPath = `vendor/sources/${sourceId}.json`;
const provenancePath = `vendor/provenance/${sourceId}.json`;
const lockPath = `vendor/locks/${sourceId}.json`;
const destinationPath = `plugins/cognition/skills/${sourceId}`;
const releaseInputPath = ".rawr/release-input.json";
type VendorStatusRequest = Parameters<Client["vendors"]["status"]>[0];
type VendorUpdateRequest = Parameters<Client["vendors"]["update"]>[0];
type VendorContentWorkspaceRef = VendorStatusRequest["contentWorkspace"];
const contentWorkspace: VendorContentWorkspaceRef = Object.freeze({
  locator: "/tmp/content-workspace",
  repositoryIdentity: "git:personal-rawr-hq",
  contentAuthority: "personal-rawr-hq",
  refName: "refs/heads/main",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
  releaseInputPath,
});

describe("vendor lifecycle applications", () => {
  it("rejects corrupt canonical records before upstream observation or authoring", async () => {
    const harness = new VendorHarness();
    harness.corruptFile(declarationPath);

    const status = await createVendorStatus(harness)({ contentWorkspace });
    const update = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(status).toMatchObject({ kind: "Rejected", issues: [{ code: "PayloadMismatch" }] });
    expect(update).toMatchObject({ kind: "Rejected", issues: [{ code: "PayloadMismatch" }] });
    expect(harness.counters.observeRemote).toBe(0);
    expect(harness.counters.materializeRemote).toBe(0);
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
  });

  it("rejects non-canonical release-input bytes before record or upstream reads", async () => {
    const harness = new VendorHarness();
    harness.corruptFile(releaseInputPath);

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({ kind: "Rejected", issues: [{ code: "PayloadMismatch" }] });
    expect(harness.counters.readFile).toBe(1);
    expect(harness.counters.readTree).toBe(0);
    expect(harness.counters.observeRemote).toBe(0);
    expect(harness.counters.capture).toBe(0);
  });

  it("keeps held and already-current sources read-only", async () => {
    const current = new VendorHarness();
    const currentResult = await createVendorUpdate(current)({ contentWorkspace, sourceIds: [sourceId] });
    expect(currentResult).toEqual({ kind: "ReadOnlyConverged", sourceIds: [sourceId] });
    expect(current.counters.materializeRemote).toBe(0);
    expect(current.counters.capture).toBe(0);
    expect(current.counters.apply).toBe(0);

    const held = new VendorHarness({ policy: "held" });
    const heldStatus = await createVendorStatus(held)({ contentWorkspace });
    expect(heldStatus).toMatchObject({
      kind: "VendorStatus",
      sources: [{ sourceId, classification: "Held" }],
    });
    expect(held.counters.observeRemote).toBe(0);
    expect(held.counters.materializeRemote).toBe(0);
  });

  it("classifies local destination drift without consulting upstream", async () => {
    const harness = new VendorHarness();
    harness.setDestination("locally edited payload\n");

    const result = await createVendorStatus(harness)({ contentWorkspace });

    expect(result).toMatchObject({
      kind: "VendorStatus",
      sources: [{ sourceId, classification: "Diverged" }],
    });
    expect(harness.counters.observeRemote).toBe(0);
    expect(harness.counters.materializeRemote).toBe(0);
  });

  it("authors exact canonical writes, settles once, and stutters on repeat", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    const update = createVendorUpdate(harness);

    const first = await update({ contentWorkspace, sourceIds: [sourceId] });

    expect(first).toEqual({
      kind: "AuthoredReviewableChanges",
      sourceIds: [sourceId],
      changedPaths: [
        releaseInputPath,
        destinationPath,
        lockPath,
        provenancePath,
        declarationPath,
      ].sort(compareText),
    });
    expect(harness.lastPlanDigest).toMatch(/^sha256_[0-9a-f]{64}$/u);
    expect(harness.lastWrites.map((write) => [write.kind, write.path])).toEqual([
      ["ReplaceTree", destinationPath],
      ["ReplaceFile", lockPath],
      ["ReplaceFile", provenancePath],
      ["ReplaceFile", declarationPath],
      ["ReplaceFile", releaseInputPath],
    ]);
    expectCanonicalBindingRewrites(harness.lastWrites);
    expect(harness.counters.capture).toBe(1);
    expect(harness.counters.apply).toBe(1);
    expect(harness.counters.settle).toBe(1);
    expect(harness.counters.restore).toBe(0);
    expect(harness.counters.release).toBe(0);

    harness.resetMutationCounters();
    const repeated = await update({ contentWorkspace, sourceIds: [sourceId] });
    expect(repeated).toEqual({ kind: "ReadOnlyConverged", sourceIds: [sourceId] });
    expect(harness.counters.materializeRemote).toBe(0);
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
    expect(harness.counters.settle).toBe(0);
  });

  it("binds plan digests to exact materialized bytes", async () => {
    const left = new VendorHarness();
    const right = new VendorHarness();
    const changed = new VendorHarness();
    left.setRemote("same candidate\n", "7");
    right.setRemote("same candidate\n", "7");
    changed.setRemote("different candidate\n", "7");

    await createVendorUpdate(left)({ contentWorkspace, sourceIds: [sourceId] });
    await createVendorUpdate(right)({ contentWorkspace, sourceIds: [sourceId] });
    await createVendorUpdate(changed)({ contentWorkspace, sourceIds: [sourceId] });

    expect(left.lastPlanDigest).toBe(right.lastPlanDigest);
    expect(changed.lastPlanDigest).not.toBe(left.lastPlanDigest);
  });

  it("releases an unmutated capture when post-capture semantic truth drifts", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.driftAfterCapture = true;

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({ kind: "Rejected", issues: [{ code: "LocalDrift" }] });
    expect(harness.counters.capture).toBe(1);
    expect(harness.counters.apply).toBe(0);
    expect(harness.counters.release).toBe(1);
    expect(harness.counters.restore).toBe(0);
  });

  it("rejects materialized bytes that do not match the classified Git tree", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.corruptMaterializedBytes = true;

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "PayloadMismatch", sourceId }],
    });
    expect(harness.counters.materializeRemote).toBe(1);
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
  });

  it("restores and settles after a partial authoring failure", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.failApplyAfterFirstWrite = true;

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({
      kind: "FailedRestored",
      sourceIds: [sourceId],
      issues: [{ code: "AuthoringFailed" }],
    });
    expect(harness.counters.restore).toBe(1);
    expect(harness.counters.settle).toBe(1);
  });

  it("reports unresolved restoration and releases its hidden recovery authority", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.failApplyAfterFirstWrite = true;
    harness.failRestore = true;

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({
      kind: "RestorationFailed",
      sourceIds: [sourceId],
      issues: [
        { code: "AuthoringFailed" },
        { code: "RestorationFailed" },
      ],
    });
    expect(harness.counters.restore).toBe(1);
    expect(harness.releasedDisposition).toBe("UnsettledRecovery");
  });

  it("restores when post-write canonical verification fails", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.corruptAfterApply = true;

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({ kind: "FailedRestored", issues: [{ code: "AuthoringFailed" }] });
    expect(harness.counters.restore).toBe(1);
    expect(harness.counters.settle).toBe(1);
  });

  it("defensively normalizes public issue details to the output contract", () => {
    const empty = vendorIssue("RuntimeFailure", " \n\t ");
    const oversized = vendorIssue("RuntimeFailure", "x".repeat(8_192));
    const result = {
      kind: "Rejected",
      sourceIds: [sourceId],
      issues: [empty, oversized],
    } as const;

    expect(empty.detail).toBe("Vendor lifecycle operation failed.");
    expect(oversized.detail).toHaveLength(4_096);
    expect(oversized.detail.endsWith("...")).toBe(true);
    expect(Value.Check(VendorUpdateResultSchema, result)).toBe(true);
  });

  it.each([
    {
      stage: "observe",
      rawDetail: "",
      expectedDetail: "Remote content observation failed because the Git operation failed.",
    },
    {
      stage: "ancestry",
      rawDetail: `provider-secret-marker:${"z".repeat(8_192)}`,
      expectedDetail: "Remote ancestry verification failed because the Git operation failed.",
    },
    {
      stage: "materialize",
      rawDetail: "ENOENT: /Users/private/content-workspace/vendor-secret",
      expectedDetail: "Remote content materialization failed because the Git operation failed.",
    },
  ] as const)("maps $stage provider diagnostics to a stable public update failure", async ({
    stage,
    rawDetail,
    expectedDetail,
  }) => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.failUpstream(stage, rawDetail);

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "RuntimeFailure", sourceId, detail: expectedDetail }],
    });
    expect(Value.Check(VendorUpdateResultSchema, result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain("provider-secret-marker");
    expect(JSON.stringify(result)).not.toContain("/Users/private");
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
    expect(harness.counters.restore).toBe(0);
    expect(harness.counters.settle).toBe(0);
  });

  it.each(["observe", "ancestry"] as const)(
    "classifies an unavailable upstream %s authority without authoring",
    async (stage) => {
      const harness = new VendorHarness();
      harness.setRemote("next payload\n", "7");
      harness.failUpstream(stage, "private provider diagnostic");

      const result = await createVendorStatus(harness)({ contentWorkspace });

      expect(result).toMatchObject({
        kind: "VendorStatus",
        sources: [{ sourceId, classification: "Unavailable" }],
      });
      expect(Value.Check(VendorStatusResultSchema, result)).toBe(true);
      expect(JSON.stringify(result)).not.toContain("private provider diagnostic");
      expect(harness.counters.materializeRemote).toBe(0);
      expect(harness.counters.capture).toBe(0);
      expect(harness.counters.apply).toBe(0);
    },
  );

  it("keeps status read-only when update materialization is unavailable", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.failUpstream("materialize", "private provider diagnostic");

    const result = await createVendorStatus(harness)({ contentWorkspace });

    expect(result).toMatchObject({
      kind: "VendorStatus",
      sources: [{ sourceId, classification: "UpdateAvailable" }],
    });
    expect(Value.Check(VendorStatusResultSchema, result)).toBe(true);
    expect(harness.counters.materializeRemote).toBe(0);
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
  });
});

interface HarnessOptions {
  readonly policy?: "tracked" | "held";
}

interface FileImage {
  readonly mode: "100644" | "100755";
  readonly bytes: Uint8Array;
}

type PathImage =
  | Readonly<{ kind: "File"; value: FileImage }>
  | Readonly<{ kind: "Tree"; value: readonly MaterializedContentTreeEntry[] }>
  | Readonly<{ kind: "Missing" }>;

type CaptureLifecycle = "Captured" | "Partial" | "Applied" | "Converged" | "Restored";
type UpstreamFailureStage = "observe" | "materialize" | "ancestry";

class VendorHarness {
  readonly clock = Object.freeze({ now: () => new Date(observedAt) });
  readonly counters = {
    inspectWorkspace: 0,
    readFile: 0,
    readTree: 0,
    observeRemote: 0,
    materializeRemote: 0,
    isAncestor: 0,
    capture: 0,
    apply: 0,
    restore: 0,
    settle: 0,
    release: 0,
  };
  readonly contentWorkspace: ContentWorkspaceAsyncPort;
  lastPlanDigest = "";
  lastWrites: readonly ContentWorkspaceWrite[] = [];
  releasedDisposition: "NoMutation" | "UnsettledRecovery" | undefined;
  driftAfterCapture = false;
  corruptMaterializedBytes = false;
  failApplyAfterFirstWrite = false;
  failRestore = false;
  corruptAfterApply = false;

  private readonly identity: ContentWorkspaceIdentity = Object.freeze({
    root: contentWorkspace.locator,
    refName: contentWorkspace.refName,
    commit: contentWorkspace.sourceCommit,
    tree: contentWorkspace.sourceTree,
    objectFormat: "sha1",
    remoteUrls: [contentWorkspace.repositoryIdentity],
  });
  private readonly files = new Map<string, FileImage>();
  private readonly trees = new Map<string, readonly MaterializedContentTreeEntry[]>();
  private readonly upstreamFailures = new Map<UpstreamFailureStage, ContentWorkspaceFailure>();
  private remote: MaterializedRemoteContentTree;
  private captureImages = new Map<string, PathImage>();
  private captureLifecycle: CaptureLifecycle | undefined;

  constructor(options: HarnessOptions = {}) {
    const admittedEntries = materializedEntries("current payload\n");
    const admitted = sourceIdentity("1", admittedEntries);
    const declaration: VendorSourceDeclaration = Object.freeze({
      schemaVersion: 1,
      sourceId,
      policy: options.policy ?? "tracked",
      repositoryIdentity: admitted.repositoryIdentity,
      refName: admitted.refName,
      sourcePath: `skills/${sourceId}`,
      destinationPath,
      provenancePath,
      lockPath,
      curationRevision: 1,
      supportedBaseline: "codex>=0.144.5",
    });
    const provenance: VendorProvenanceRecord = Object.freeze({
      schemaVersion: 1,
      sourceId,
      admitted,
      importedPayloadDigest: admitted.payloadDigest,
      curationRevision: 1,
      supportedBaseline: declaration.supportedBaseline,
      observedLatest: admitted,
      observedAt,
      disposition: declaration.policy === "held" ? "held" : "admitted",
    });
    const lock: VendorLockRecord = Object.freeze({ schemaVersion: 1, sourceId, admitted });
    const declarationBytes = encodeVendorSourceDeclaration(declaration);
    const provenanceBytes = encodeVendorProvenanceRecord(provenance);
    const lockBytes = encodeVendorLockRecord(lock);
    this.files.set(declarationPath, fileImage(declarationBytes));
    this.files.set(provenancePath, fileImage(provenanceBytes));
    this.files.set(lockPath, fileImage(lockBytes));
    this.files.set(releaseInputPath, fileImage(releaseInputBytes(declarationBytes, provenanceBytes, lockBytes)));
    this.trees.set(destinationPath, admittedEntries);
    this.remote = remoteTree(admitted.sourceCommit, admitted.sourceTree, admittedEntries);

    const contentWorkspacePort: ContentWorkspaceAsyncPort = {
      inspectWorkspace: async () => {
        this.counters.inspectWorkspace += 1;
        return this.identity;
      },
      readFile: async ({ path }) => {
        this.counters.readFile += 1;
        const file = this.files.get(path);
        if (file === undefined) throw resourceFailure("read-file", "Missing", path);
        return new Uint8Array(file.bytes);
      },
      readTree: async ({ path }) => {
        this.counters.readTree += 1;
        const tree = this.trees.get(path);
        if (tree === undefined) throw resourceFailure("read-tree", "Missing", path);
        return tree.map(({ path: entryPath, mode, blob }) => Object.freeze({ path: entryPath, mode, blob }));
      },
      observeRemote: async () => {
        this.counters.observeRemote += 1;
        const failure = this.upstreamFailures.get("observe");
        if (failure !== undefined) throw failure;
        return remoteMetadata(this.remote);
      },
      materializeRemote: async () => {
        this.counters.materializeRemote += 1;
        const failure = this.upstreamFailures.get("materialize");
        if (failure !== undefined) throw failure;
        if (!this.corruptMaterializedBytes) return cloneRemote(this.remote);
        return Object.freeze({
          ...this.remote,
          entries: this.remote.entries.map((entry) => Object.freeze({
            ...entry,
            bytes: encoder.encode("wrong bytes\n"),
          })),
        });
      },
      isAncestor: async () => {
        this.counters.isAncestor += 1;
        const failure = this.upstreamFailures.get("ancestry");
        if (failure !== undefined) throw failure;
        return true;
      },
      capture: async ({ readToken, paths }) => {
        this.counters.capture += 1;
        this.captureImages = new Map(paths.map((path) => [path, this.snapshot(path)]));
        this.captureLifecycle = "Captured";
        if (this.driftAfterCapture) this.corruptFile(declarationPath);
        return Object.freeze({ handle: "capture-1", readToken, paths: Object.freeze([...paths]) });
      },
      apply: async ({ planDigest, readToken, writes }) => {
        this.counters.apply += 1;
        this.lastPlanDigest = planDigest;
        this.lastWrites = cloneWrites(writes);
        if (this.failApplyAfterFirstWrite) {
          this.applyWrite(writes[0]);
          this.captureLifecycle = "Partial";
          throw resourceFailure("apply", "FilesystemFailed", writes[0]?.path);
        }
        for (const write of writes) this.applyWrite(write);
        this.captureLifecycle = "Applied";
        if (this.corruptAfterApply) this.corruptFile(provenancePath);
        return Object.freeze({
          planDigest,
          readToken,
          outcome: "Applied",
          changedPaths: Object.freeze(writes.map((write) => write.path)),
        });
      },
      restore: async ({ planDigest, readToken }) => {
        this.counters.restore += 1;
        if (this.failRestore) {
          this.captureLifecycle = "Partial";
          throw resourceFailure("restore", "FilesystemFailed");
        }
        for (const [path, image] of this.captureImages) this.restore(path, image);
        this.captureLifecycle = "Restored";
        return Object.freeze({
          planDigest,
          readToken,
          outcome: "Restored",
          changedPaths: Object.freeze([...this.captureImages.keys()]),
        });
      },
      settle: async ({ planDigest, readToken, captureHandle }) => {
        this.counters.settle += 1;
        this.captureLifecycle = undefined;
        return Object.freeze({
          planDigest,
          readToken,
          outcome: "Settled",
          handle: captureHandle,
        });
      },
      release: async ({ readToken, captureHandle, disposition }) => {
        this.counters.release += 1;
        const noMutation = this.captureLifecycle === "Captured" || this.captureLifecycle === "Converged";
        const unsettled = this.captureLifecycle === "Partial";
        if ((disposition === "NoMutation" && !noMutation) || (disposition === "UnsettledRecovery" && !unsettled)) {
          throw resourceFailure("release", "HandleState");
        }
        this.releasedDisposition = disposition;
        this.captureLifecycle = undefined;
        return Object.freeze({
          readToken,
          outcome: disposition === "NoMutation" ? "ReleasedUnmutated" : "ReleasedUnsettled",
          handle: captureHandle,
        });
      },
    };
    this.contentWorkspace = Object.freeze(contentWorkspacePort);
  }

  setRemote(text: string, seed: string): void {
    const entries = materializedEntries(text);
    this.remote = remoteTree(seed.repeat(40), seed.repeat(40), entries);
  }

  setDestination(text: string): void {
    this.trees.set(destinationPath, materializedEntries(text));
  }

  failUpstream(stage: UpstreamFailureStage, detail: string): void {
    const operation = stage === "observe"
      ? "observe-remote"
      : stage === "materialize"
        ? "materialize-remote"
        : "ancestry";
    this.upstreamFailures.set(stage, resourceFailure(operation, "GitFailed", undefined, detail));
  }

  corruptFile(path: string): void {
    const current = this.files.get(path);
    if (current !== undefined) {
      const bytes = new Uint8Array(current.bytes.byteLength + 1);
      bytes.set(current.bytes);
      bytes[bytes.byteLength - 1] = 0x20;
      this.files.set(path, Object.freeze({ ...current, bytes }));
    }
  }

  resetMutationCounters(): void {
    this.counters.materializeRemote = 0;
    this.counters.capture = 0;
    this.counters.apply = 0;
    this.counters.restore = 0;
    this.counters.settle = 0;
    this.counters.release = 0;
  }

  private snapshot(path: string): PathImage {
    const file = this.files.get(path);
    if (file !== undefined) return Object.freeze({ kind: "File", value: fileImage(file.bytes, file.mode) });
    const tree = this.trees.get(path);
    return tree === undefined
      ? Object.freeze({ kind: "Missing" })
      : Object.freeze({ kind: "Tree", value: cloneEntries(tree) });
  }

  private applyWrite(write: ContentWorkspaceWrite | undefined): void {
    if (write === undefined) return;
    if (write.kind === "ReplaceFile") {
      this.files.set(write.path, fileImage(write.bytes, write.mode));
      this.trees.delete(write.path);
      return;
    }
    this.trees.set(write.path, cloneEntries(write.entries));
    this.files.delete(write.path);
  }

  private restore(path: string, image: PathImage): void {
    this.files.delete(path);
    this.trees.delete(path);
    if (image.kind === "File") this.files.set(path, fileImage(image.value.bytes, image.value.mode));
    if (image.kind === "Tree") this.trees.set(path, cloneEntries(image.value));
  }
}

function releaseInputBytes(
  declarationBytes: Uint8Array,
  provenanceBytes: Uint8Array,
  lockBytes: Uint8Array,
): Uint8Array {
  const skillBytes = encoder.encode("declared skill\n");
  const releaseInput = must(createAgentPluginReleaseInput({
    schemaVersion: 1,
    contentAuthority: contentWorkspace.contentAuthority,
    members: [{
      kind: "agent-plugin",
      pluginId: "cognition",
      skillInventory: [{ identity: sourceId, manifestPath: `skills/${sourceId}/SKILL.md` }],
      payload: {
        protocolVersion: 1,
        manifest: [{
          path: `skills/${sourceId}/SKILL.md`,
          mode: 0o644,
          byteLength: skillBytes.byteLength,
          contentDigest: contentDigest(skillBytes),
        }],
        payloadDigest: `pd1_${"1".repeat(64)}`,
      },
      vendor: [
        binding(declarationPath, VENDOR_SOURCE_PROTOCOL, declarationBytes),
        binding(provenancePath, VENDOR_PROVENANCE_PROTOCOL, provenanceBytes),
      ],
      curation: [],
    }],
    ownershipClaims: [{ kind: "skill", identity: sourceId, ownerPluginId: "cognition" }],
    locks: [binding(lockPath, VENDOR_LOCK_PROTOCOL, lockBytes)],
    qualityPolicies: [],
  }));
  return canonicalSerializeAgentPluginReleaseInput(releaseInput);
}

function expectCanonicalBindingRewrites(writes: readonly ContentWorkspaceWrite[]): void {
  const files = new Map(
    writes.filter((write) => write.kind === "ReplaceFile").map((write) => [write.path, write.bytes]),
  );
  const releaseBytes = files.get(releaseInputPath);
  const declarationBytes = files.get(declarationPath);
  const provenanceBytes = files.get(provenancePath);
  const lockBytes = files.get(lockPath);
  expect(releaseBytes).toBeDefined();
  expect(declarationBytes).toBeDefined();
  expect(provenanceBytes).toBeDefined();
  expect(lockBytes).toBeDefined();
  const decoded = decodeAgentPluginReleaseInput(releaseBytes);
  if (!decoded.ok || declarationBytes === undefined || provenanceBytes === undefined || lockBytes === undefined) {
    throw new Error("Expected exact canonical vendor authoring bytes");
  }
  const member = decoded.value.body.members[0];
  expect(member?.vendor.find((candidate) => candidate.protocol === VENDOR_SOURCE_PROTOCOL)?.contentDigest)
    .toBe(contentDigest(declarationBytes));
  expect(member?.vendor.find((candidate) => candidate.protocol === VENDOR_PROVENANCE_PROTOCOL)?.contentDigest)
    .toBe(contentDigest(provenanceBytes));
  expect(decoded.value.body.locks[0]?.contentDigest).toBe(contentDigest(lockBytes));
  expect(decoder.decode(declarationBytes).endsWith("\n")).toBe(true);
}

function sourceIdentity(
  seed: string,
  entries: readonly ContentTreeEntry[],
): VendorSourceIdentity {
  return Object.freeze({
    repositoryIdentity: "git:vendor-upstream",
    refName: "refs/heads/main",
    sourceCommit: seed.repeat(40),
    sourceTree: seed.repeat(40),
    payloadDigest: vendorPayloadDigest(entries),
  });
}

function materializedEntries(text: string): readonly MaterializedContentTreeEntry[] {
  const bytes = encoder.encode(text);
  return Object.freeze([Object.freeze({
    path: "SKILL.md",
    mode: "100644" as const,
    blob: gitBlobId(bytes),
    bytes,
  })]);
}

function remoteTree(
  commit: string,
  tree: string,
  entries: readonly MaterializedContentTreeEntry[],
): MaterializedRemoteContentTree {
  return Object.freeze({
    repositoryIdentity: "git:vendor-upstream",
    refName: "refs/heads/main",
    sourcePath: `skills/${sourceId}`,
    commit,
    tree,
    objectFormat: "sha1",
    entries: cloneEntries(entries),
  });
}

function remoteMetadata(remote: MaterializedRemoteContentTree): RemoteContentTree {
  return Object.freeze({
    repositoryIdentity: remote.repositoryIdentity,
    refName: remote.refName,
    sourcePath: remote.sourcePath,
    commit: remote.commit,
    tree: remote.tree,
    objectFormat: remote.objectFormat,
    entries: remote.entries.map(({ path, mode, blob }) => Object.freeze({ path, mode, blob })),
  });
}

function cloneRemote(remote: MaterializedRemoteContentTree): MaterializedRemoteContentTree {
  return Object.freeze({ ...remote, entries: cloneEntries(remote.entries) });
}

function cloneEntries(
  entries: readonly MaterializedContentTreeEntry[],
): readonly MaterializedContentTreeEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({
    path: entry.path,
    mode: entry.mode,
    blob: entry.blob,
    bytes: new Uint8Array(entry.bytes),
  })));
}

function cloneWrites(writes: readonly ContentWorkspaceWrite[]): readonly ContentWorkspaceWrite[] {
  return Object.freeze(writes.map((write) => write.kind === "ReplaceFile"
    ? Object.freeze({ ...write, bytes: new Uint8Array(write.bytes) })
    : Object.freeze({ ...write, entries: cloneEntries(write.entries) })));
}

function fileImage(
  bytes: Uint8Array,
  mode: "100644" | "100755" = "100644",
): FileImage {
  return Object.freeze({ mode, bytes: new Uint8Array(bytes) });
}

function binding(id: string, protocol: string, bytes: Uint8Array) {
  return { id, protocol, contentDigest: contentDigest(bytes) };
}

function gitBlobId(bytes: Uint8Array): string {
  const hash = createHash("sha1");
  hash.update(encoder.encode(`blob ${bytes.byteLength}\0`));
  hash.update(bytes);
  return hash.digest("hex");
}

function resourceFailure(
  operation: ContentWorkspaceFailure["operation"],
  reason: ContentWorkspaceFailure["reason"],
  path?: string,
  detail = `${operation} failed: ${reason}`,
): ContentWorkspaceFailure {
  return Object.freeze({
    _tag: "ContentWorkspaceFailure",
    operation,
    reason,
    ...(path === undefined ? {} : { path }),
    detail,
  });
}

function must<T, E>(result: ReleaseResult<T, E>): T {
  if (!result.ok) throw new Error(`Expected release fixture success: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function createVendorStatus(runtime: VendorHarness) {
  const client = createLifecycleTestClient({
    contentWorkspace: runtime.contentWorkspace,
    clock: runtime.clock,
  });
  return (request: VendorStatusRequest) => client.vendors.status(request, testInvocation);
}

function createVendorUpdate(runtime: VendorHarness) {
  const client = createLifecycleTestClient({
    contentWorkspace: runtime.contentWorkspace,
    clock: runtime.clock,
  });
  return (request: VendorUpdateRequest) => client.vendors.update(request, testInvocation);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
