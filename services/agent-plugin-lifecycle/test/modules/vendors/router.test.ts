import { createHash } from "node:crypto";

import type {
  ContentWorkspaceFailure,
  ContentWorkspaceIdentity,
  ContentWorkspaceResource,
  ContentWorkspaceWrite,
  MaterializedContentTreeEntry,
} from "@rawr/resource-content-workspace";
import type {
  MaterializedRemoteContentTree,
  RemoteContentTree,
  VersionedContentFailure,
  VersionedContentResource,
  VersionedContentTreeEntry,
} from "@rawr/resource-versioned-content";
import { Effect } from "effect";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Client } from "../../../src/client";
import type { ReleaseResult } from "../../../src/service/model/dto/release-result";
import { contentDigest } from "../../../src/service/model/policy/release-digest";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseRepositoryIdentity,
} from "../../../src/service/model/policy/release-identity";
import {
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
} from "../../../src/service/model/policy/release-input";
import { canonicalSerializeAgentPluginReleaseInput } from "../../../src/service/model/policy/release-input-codec";
import {
  VendorStatusResultSchema,
  VendorUpdateResultSchema,
} from "../../../src/service/modules/vendors/model/dto/vendor-operations";
import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
  type VendorLockRecord,
  type VendorProvenanceRecord,
  type VendorSourceDeclaration,
  type VendorSourceIdentity,
} from "../../../src/service/modules/vendors/model/dto/vendor-records";
import { vendorIssue } from "../../../src/service/modules/vendors/model/policy/vendor-policy-result";
import {
  decodeVendorProvenanceRecord,
  encodeVendorLockRecord,
  encodeVendorProvenanceRecord,
  encodeVendorSourceDeclaration,
  vendorPayloadDigest,
} from "../../../src/service/modules/vendors/model/policy/vendor-record-codec";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../support/client";

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
  repositoryIdentity: parsed(parseRepositoryIdentity("git:personal-rawr-hq")),
  contentAuthority: parsed(parseContentAuthority("personal-rawr-hq")),
  refName: "refs/heads/main",
  sourceCommit: parsed(parseGitCommitId("a".repeat(40))),
  sourceTree: parsed(parseGitTreeId("b".repeat(40))),
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
    const currentResult = await createVendorUpdate(current)({
      contentWorkspace,
      sourceIds: [sourceId],
    });
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

    const heldUpdate = await createVendorUpdate(held)({
      contentWorkspace,
      sourceIds: [sourceId],
    });
    expect(heldUpdate).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "HeldSource", sourceId }],
    });
    expect(held.counters.observeRemote).toBe(0);
    expect(held.counters.materializeRemote).toBe(0);
    expect(held.counters.capture).toBe(0);
    expect(held.counters.apply).toBe(0);
  });

  it("rejects an undeclared source before upstream observation or mutation", async () => {
    const harness = new VendorHarness();
    const undeclaredSourceId = "missing";

    const result = await createVendorUpdate(harness)({
      contentWorkspace,
      sourceIds: [undeclaredSourceId],
    });

    expect(result).toMatchObject({
      kind: "Rejected",
      sourceIds: [undeclaredSourceId],
      issues: [{ code: "UndeclaredSource", sourceId: undeclaredSourceId }],
    });
    expect(harness.counters).toMatchObject({
      observeRemote: 0,
      materializeRemote: 0,
      capture: 0,
      apply: 0,
      restore: 0,
      settle: 0,
    });
  });

  it("rejects non-fast-forward ancestry in status and update without mutation", async () => {
    const harness = new VendorHarness();
    harness.setRemote("diverged payload\n", "7");
    harness.setAncestry(false);

    const status = await createVendorStatus(harness)({ contentWorkspace });
    const update = await createVendorUpdate(harness)({
      contentWorkspace,
      sourceIds: [sourceId],
    });

    expect(status).toMatchObject({
      kind: "VendorStatus",
      sources: [{ sourceId, classification: "Diverged" }],
    });
    expect(update).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "NonFastForward", sourceId }],
    });
    expect(harness.counters.materializeRemote).toBe(0);
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
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

  it("records the authored provenance timestamp from the supplied clock", async () => {
    const suppliedObservedAt = "2027-03-04T05:06:07.890Z";
    const harness = new VendorHarness({ observedAt: suppliedObservedAt });
    harness.setRemote("next payload\n", "7");

    await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    const provenanceWrite = harness.lastWrites.find(
      (write) => write.kind === "ReplaceFile" && write.path === provenancePath
    );
    expect(provenanceWrite?.kind).toBe("ReplaceFile");
    if (provenanceWrite?.kind !== "ReplaceFile") {
      throw new Error("Expected authored provenance bytes");
    }
    const decoded = decodeVendorProvenanceRecord(provenanceWrite.bytes);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error(decoded.failure.detail);
    expect(decoded.value.observedAt).toBe(suppliedObservedAt);
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

  it("rejects an upstream payload without a root SKILL.md before materialization", async () => {
    const harness = new VendorHarness();
    harness.setRemoteWithoutSkill();

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "UnsupportedLayout", sourceId }],
    });
    expect(harness.counters.materializeRemote).toBe(0);
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
  });

  it("rejects a remote that advances between observation and materialization", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.driftMaterializedRemote = true;

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "NonFastForward", sourceId }],
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

  it("defers interruption during partial apply through restoration and settlement", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.failApplyAfterFirstWrite = true;
    harness.pauseAfterPartialApply = true;
    const client = createLifecycleTestClient({
      contentWorkspace: harness.contentWorkspace,
      clock: harness.clock,
      versionedContent: harness.versionedContent,
    });
    const controller = new AbortController();
    const update = client.vendors.update(
      { contentWorkspace, sourceIds: [sourceId] },
      { ...testInvocation, signal: controller.signal }
    );
    const completed = update.then(
      (value) => ({ kind: "Success" as const, value }),
      (error: unknown) => ({ kind: "Failure" as const, error })
    );

    await harness.partialApplyPaused.promise;
    controller.abort(new Error("Vendor update cancelled"));
    const beforeResume = await Promise.race([
      completed.then(() => "settled" as const),
      Promise.resolve("pending" as const),
    ]);

    try {
      expect(beforeResume).toBe("pending");
      expect(harness.counters.restore).toBe(0);
      expect(harness.counters.settle).toBe(0);
    } finally {
      harness.continuePartialApply.resolve();
    }

    const completion = await completed;
    expect(completion).toMatchObject({
      kind: "Failure",
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(harness.counters.restore).toBe(1);
    expect(harness.counters.settle).toBe(1);
    expect(harness.destinationText()).toBe("current payload\n");
    expect(harness.hasOpenCapture()).toBe(false);
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
      issues: [{ code: "AuthoringFailed" }, { code: "RestorationFailed" }],
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

  it("restores and settles after the first post-apply settlement fails", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    harness.failFirstSettlement = true;

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: [sourceId] });

    expect(result).toMatchObject({
      kind: "FailedRestored",
      sourceIds: [sourceId],
      issues: [{ code: "CleanupFailed" }],
    });
    if (result.kind !== "FailedRestored") {
      throw new Error("Settlement failure fixture did not restore the authored workspace");
    }
    expect(result.restoredPaths).toEqual(
      [releaseInputPath, destinationPath, lockPath, provenancePath, declarationPath].sort(
        compareText
      )
    );
    expect(harness.events).toEqual([
      "capture",
      "revalidate",
      "apply",
      "verify",
      "settle",
      "restore",
      "settle",
    ]);
    expect(harness.destinationText()).toBe("current payload\n");
    expect(harness.hasOpenCapture()).toBe(false);
  });

  it("does not enter mutation when cancellation arrives during preflight", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    const preflight = harness.deferRemoteObservation();
    const client = createLifecycleTestClient({
      contentWorkspace: harness.contentWorkspace,
      clock: harness.clock,
      versionedContent: harness.versionedContent,
    });
    const controller = new AbortController();
    const update = client.vendors.update(
      { contentWorkspace, sourceIds: [sourceId] },
      { ...testInvocation, signal: controller.signal }
    );

    await preflight.started;
    controller.abort(new Error("Vendor update cancelled during preflight"));
    preflight.resume();

    await expect(update).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
  });

  it("settles before surfacing cancellation after capture begins, then stutters", async () => {
    const harness = new VendorHarness();
    harness.setRemote("next payload\n", "7");
    const capture = harness.deferCapture();
    const client = createLifecycleTestClient({
      contentWorkspace: harness.contentWorkspace,
      clock: harness.clock,
      versionedContent: harness.versionedContent,
    });
    const controller = new AbortController();
    let settled = false;
    const update = client.vendors
      .update(
        { contentWorkspace, sourceIds: [sourceId] },
        { ...testInvocation, signal: controller.signal }
      )
      .then(
        (value) => {
          settled = true;
          return { kind: "Fulfilled" as const, value };
        },
        (error: unknown) => {
          settled = true;
          return { kind: "Rejected" as const, error };
        }
      );

    await capture.started;
    controller.abort(new Error("Vendor update cancelled after capture began"));
    await Promise.resolve();

    expect(settled).toBe(false);
    expect(harness.events).toEqual(["capture"]);

    capture.resume();
    const outcome = await update;

    expect(outcome).toMatchObject({
      kind: "Rejected",
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(harness.events).toEqual(["capture", "revalidate", "apply", "verify", "settle"]);
    expect(harness.counters.restore).toBe(0);
    expect(harness.counters.release).toBe(0);

    harness.resetMutationCounters();
    const repeated = await createVendorUpdate(harness)({
      contentWorkspace,
      sourceIds: [sourceId],
    });
    expect(repeated).toEqual({ kind: "ReadOnlyConverged", sourceIds: [sourceId] });
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
    expect(harness.counters.settle).toBe(0);
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

  it.each([
    "observe",
    "ancestry",
  ] as const)("classifies an unavailable upstream %s authority without authoring", async (stage) => {
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
  });

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
  readonly observedAt?: string;
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
  readonly clock: Readonly<{ now: () => Date }>;
  readonly events: string[] = [];
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
  readonly contentWorkspace: ContentWorkspaceResource<never>;
  readonly versionedContent: VersionedContentResource<never>;
  lastPlanDigest = "";
  lastWrites: readonly ContentWorkspaceWrite[] = [];
  releasedDisposition: "NoMutation" | "UnsettledRecovery" | undefined;
  driftAfterCapture = false;
  driftMaterializedRemote = false;
  failApplyAfterFirstWrite = false;
  pauseAfterPartialApply = false;
  failRestore = false;
  failFirstSettlement = false;
  corruptAfterApply = false;
  readonly partialApplyPaused = Promise.withResolvers<void>();
  readonly continuePartialApply = Promise.withResolvers<void>();

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
  private readonly upstreamFailures = new Map<UpstreamFailureStage, VersionedContentFailure>();
  private remote: MaterializedRemoteContentTree;
  private remoteObservationGate:
    | Readonly<{ started: () => void; resume: Promise<void> }>
    | undefined;
  private captureGate: Readonly<{ started: () => void; resume: Promise<void> }> | undefined;
  private captureImages = new Map<string, PathImage>();
  private captureLifecycle: CaptureLifecycle | undefined;
  private ancestor = true;

  constructor(options: HarnessOptions = {}) {
    this.clock = Object.freeze({ now: () => new Date(options.observedAt ?? observedAt) });
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
    this.files.set(
      releaseInputPath,
      fileImage(releaseInputBytes(declarationBytes, provenanceBytes, lockBytes))
    );
    this.trees.set(destinationPath, admittedEntries);
    this.remote = remoteTree(admitted.sourceCommit, admitted.sourceTree, admittedEntries);

    const harness = this;
    const contentWorkspaceResource: ContentWorkspaceResource<never> = {
      ...unavailableContentWorkspace(),
      inspectWorkspace: () =>
        Effect.sync(() => {
          harness.counters.inspectWorkspace += 1;
          if (harness.captureLifecycle === "Captured") harness.events.push("revalidate");
          if (harness.captureLifecycle === "Applied") harness.events.push("verify");
          return harness.identity;
        }),
      readFile: ({ path }) =>
        Effect.gen(function* () {
          harness.counters.readFile += 1;
          const file = harness.files.get(path);
          if (file === undefined) {
            return yield* Effect.fail(resourceFailure("read-file", "Missing", path));
          }
          return new Uint8Array(file.bytes);
        }),
      readTree: ({ path }) =>
        Effect.gen(function* () {
          harness.counters.readTree += 1;
          const tree = harness.trees.get(path);
          if (tree === undefined) {
            return yield* Effect.fail(resourceFailure("read-tree", "Missing", path));
          }
          return tree.map(({ path: entryPath, mode, blob }) =>
            Object.freeze({ path: entryPath, mode, blob })
          );
        }),
      capture: ({ readToken, paths }) =>
        Effect.gen(function* () {
          harness.counters.capture += 1;
          harness.events.push("capture");
          const gate = harness.captureGate;
          if (gate !== undefined) {
            gate.started();
            yield* Effect.promise(() => gate.resume);
            harness.captureGate = undefined;
          }
          harness.captureImages = new Map(paths.map((path) => [path, harness.snapshot(path)]));
          harness.captureLifecycle = "Captured";
          if (harness.driftAfterCapture) harness.corruptFile(declarationPath);
          return Object.freeze({
            handle: "capture-1",
            readToken,
            paths: Object.freeze([...paths]),
          });
        }),
      apply: ({ planDigest, readToken, writes }) =>
        Effect.gen(function* () {
          harness.counters.apply += 1;
          harness.events.push("apply");
          harness.lastPlanDigest = planDigest;
          harness.lastWrites = cloneWrites(writes);
          if (harness.failApplyAfterFirstWrite) {
            harness.applyWrite(writes[0]);
            harness.captureLifecycle = "Partial";
            if (harness.pauseAfterPartialApply) {
              harness.partialApplyPaused.resolve();
              yield* Effect.promise(() => harness.continuePartialApply.promise);
            }
            return yield* Effect.fail(
              resourceFailure("apply", "FilesystemFailed", writes[0]?.path)
            );
          }
          for (const write of writes) harness.applyWrite(write);
          harness.captureLifecycle = "Applied";
          if (harness.corruptAfterApply) harness.corruptFile(provenancePath);
          return Object.freeze({
            planDigest,
            readToken,
            outcome: "Applied" as const,
            changedPaths: Object.freeze(writes.map((write) => write.path)),
          });
        }),
      restore: ({ planDigest, readToken }) =>
        Effect.gen(function* () {
          harness.counters.restore += 1;
          harness.events.push("restore");
          if (harness.failRestore) {
            harness.captureLifecycle = "Partial";
            return yield* Effect.fail(resourceFailure("restore", "FilesystemFailed"));
          }
          for (const [path, image] of harness.captureImages) harness.restore(path, image);
          harness.captureLifecycle = "Restored";
          return Object.freeze({
            planDigest,
            readToken,
            outcome: "Restored" as const,
            changedPaths: Object.freeze([...harness.captureImages.keys()]),
          });
        }),
      settle: ({ planDigest, readToken, captureHandle }) =>
        Effect.gen(function* () {
          harness.counters.settle += 1;
          harness.events.push("settle");
          if (harness.failFirstSettlement) {
            harness.failFirstSettlement = false;
            return yield* Effect.fail(resourceFailure("settle", "FilesystemFailed"));
          }
          harness.captureLifecycle = undefined;
          return Object.freeze({
            planDigest,
            readToken,
            outcome: "Settled" as const,
            handle: captureHandle,
          });
        }),
      release: ({ readToken, captureHandle, disposition }) =>
        Effect.gen(function* () {
          harness.counters.release += 1;
          const noMutation =
            harness.captureLifecycle === "Captured" || harness.captureLifecycle === "Converged";
          const unsettled = harness.captureLifecycle === "Partial";
          if (
            (disposition === "NoMutation" && !noMutation) ||
            (disposition === "UnsettledRecovery" && !unsettled)
          ) {
            return yield* Effect.fail(resourceFailure("release", "HandleState"));
          }
          harness.releasedDisposition = disposition;
          harness.captureLifecycle = undefined;
          return Object.freeze({
            readToken,
            outcome:
              disposition === "NoMutation"
                ? ("ReleasedUnmutated" as const)
                : ("ReleasedUnsettled" as const),
            handle: captureHandle,
          });
        }),
    };
    this.contentWorkspace = Object.freeze(contentWorkspaceResource);
    this.versionedContent = Object.freeze({
      observeRemote: () =>
        Effect.gen(function* () {
          harness.counters.observeRemote += 1;
          const gate = harness.remoteObservationGate;
          if (gate !== undefined) {
            gate.started();
            yield* Effect.promise(() => gate.resume);
            harness.remoteObservationGate = undefined;
          }
          const failure = harness.upstreamFailures.get("observe");
          if (failure !== undefined) return yield* Effect.fail(failure);
          return remoteMetadata(harness.remote);
        }),
      materializeRemote: () =>
        Effect.gen(function* () {
          harness.counters.materializeRemote += 1;
          const failure = harness.upstreamFailures.get("materialize");
          if (failure !== undefined) return yield* Effect.fail(failure);
          if (!harness.driftMaterializedRemote) return cloneRemote(harness.remote);
          const entries = materializedEntries("later payload\n");
          return remoteTree("8".repeat(40), "8".repeat(40), entries);
        }),
      isAncestor: () =>
        Effect.gen(function* () {
          harness.counters.isAncestor += 1;
          const failure = harness.upstreamFailures.get("ancestry");
          if (failure !== undefined) return yield* Effect.fail(failure);
          return harness.ancestor;
        }),
    } satisfies VersionedContentResource<never>);
  }

  setRemote(text: string, seed: string): void {
    const entries = materializedEntries(text);
    this.remote = remoteTree(seed.repeat(40), seed.repeat(40), entries);
  }

  setRemoteWithoutSkill(): void {
    const bytes = encoder.encode("supporting material\n");
    const entries = Object.freeze([
      Object.freeze({
        path: "README.md",
        mode: "100644" as const,
        blob: gitBlobId(bytes),
        bytes,
      }),
    ]);
    this.remote = remoteTree("7".repeat(40), "7".repeat(40), entries);
  }

  setDestination(text: string): void {
    this.trees.set(destinationPath, materializedEntries(text));
  }

  setAncestry(isAncestor: boolean): void {
    this.ancestor = isAncestor;
  }

  deferRemoteObservation(): Readonly<{ started: Promise<void>; resume: () => void }> {
    const started = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    this.remoteObservationGate = Object.freeze({
      started: started.resolve,
      resume: resume.promise,
    });
    return Object.freeze({ started: started.promise, resume: resume.resolve });
  }

  deferCapture(): Readonly<{ started: Promise<void>; resume: () => void }> {
    const started = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    this.captureGate = Object.freeze({
      started: started.resolve,
      resume: resume.promise,
    });
    return Object.freeze({ started: started.promise, resume: resume.resolve });
  }

  failUpstream(stage: UpstreamFailureStage, detail: string): void {
    const operation =
      stage === "observe"
        ? "observe-remote"
        : stage === "materialize"
          ? "materialize-remote"
          : "ancestry";
    this.upstreamFailures.set(
      stage,
      versionedContentFailure(operation, "CommandFailed", undefined, detail)
    );
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
    this.events.length = 0;
    this.counters.materializeRemote = 0;
    this.counters.capture = 0;
    this.counters.apply = 0;
    this.counters.restore = 0;
    this.counters.settle = 0;
    this.counters.release = 0;
  }

  destinationText(): string {
    const entry = this.trees.get(destinationPath)?.[0];
    return entry === undefined ? "" : decoder.decode(entry.bytes);
  }

  hasOpenCapture(): boolean {
    return this.captureLifecycle !== undefined;
  }

  private snapshot(path: string): PathImage {
    const file = this.files.get(path);
    if (file !== undefined)
      return Object.freeze({ kind: "File", value: fileImage(file.bytes, file.mode) });
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
  lockBytes: Uint8Array
): Uint8Array {
  const skillBytes = encoder.encode("declared skill\n");
  const releaseInput = must(
    createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority: contentWorkspace.contentAuthority,
      members: [
        {
          kind: "agent-plugin",
          pluginId: "cognition",
          skillInventory: [{ identity: sourceId, manifestPath: `skills/${sourceId}/SKILL.md` }],
          payload: {
            protocolVersion: 1,
            manifest: [
              {
                path: `skills/${sourceId}/SKILL.md`,
                mode: 0o644,
                byteLength: skillBytes.byteLength,
                contentDigest: contentDigest(skillBytes),
              },
            ],
            payloadDigest: `pd1_${"1".repeat(64)}`,
          },
          vendor: [
            binding(declarationPath, VENDOR_SOURCE_PROTOCOL, declarationBytes),
            binding(provenancePath, VENDOR_PROVENANCE_PROTOCOL, provenanceBytes),
          ],
          curation: [],
        },
      ],
      ownershipClaims: [{ kind: "skill", identity: sourceId, ownerPluginId: "cognition" }],
      locks: [binding(lockPath, VENDOR_LOCK_PROTOCOL, lockBytes)],
      qualityPolicies: [],
    })
  );
  return canonicalSerializeAgentPluginReleaseInput(releaseInput);
}

function expectCanonicalBindingRewrites(writes: readonly ContentWorkspaceWrite[]): void {
  const files = new Map(
    writes.filter((write) => write.kind === "ReplaceFile").map((write) => [write.path, write.bytes])
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
  if (
    !decoded.ok ||
    declarationBytes === undefined ||
    provenanceBytes === undefined ||
    lockBytes === undefined
  ) {
    throw new Error("Expected exact canonical vendor authoring bytes");
  }
  const member = decoded.value.body.members[0];
  expect(
    member?.vendor.find((candidate) => candidate.protocol === VENDOR_SOURCE_PROTOCOL)?.contentDigest
  ).toBe(contentDigest(declarationBytes));
  expect(
    member?.vendor.find((candidate) => candidate.protocol === VENDOR_PROVENANCE_PROTOCOL)
      ?.contentDigest
  ).toBe(contentDigest(provenanceBytes));
  expect(decoded.value.body.locks[0]?.contentDigest).toBe(contentDigest(lockBytes));
  expect(decoder.decode(declarationBytes).endsWith("\n")).toBe(true);
}

function sourceIdentity(
  seed: string,
  entries: readonly VersionedContentTreeEntry[]
): VendorSourceIdentity {
  return Object.freeze({
    repositoryIdentity: "git:vendor-upstream",
    refName: "refs/heads/main",
    sourceCommit: parsed(parseGitCommitId(seed.repeat(40))),
    sourceTree: parsed(parseGitTreeId(seed.repeat(40))),
    payloadDigest: vendorPayloadDigest(entries),
  });
}

function parsed<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error("Expected a valid vendor identity fixture");
  return result.value;
}

function materializedEntries(text: string): readonly MaterializedContentTreeEntry[] {
  const bytes = encoder.encode(text);
  return Object.freeze([
    Object.freeze({
      path: "SKILL.md",
      mode: "100644" as const,
      blob: gitBlobId(bytes),
      bytes,
    }),
  ]);
}

function remoteTree(
  commit: string,
  tree: string,
  entries: readonly MaterializedContentTreeEntry[]
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
  entries: readonly MaterializedContentTreeEntry[]
): readonly MaterializedContentTreeEntry[] {
  return Object.freeze(
    entries.map((entry) =>
      Object.freeze({
        path: entry.path,
        mode: entry.mode,
        blob: entry.blob,
        bytes: new Uint8Array(entry.bytes),
      })
    )
  );
}

function cloneWrites(writes: readonly ContentWorkspaceWrite[]): readonly ContentWorkspaceWrite[] {
  return Object.freeze(
    writes.map((write) =>
      write.kind === "ReplaceFile"
        ? Object.freeze({ ...write, bytes: new Uint8Array(write.bytes) })
        : Object.freeze({ ...write, entries: cloneEntries(write.entries) })
    )
  );
}

function fileImage(bytes: Uint8Array, mode: "100644" | "100755" = "100644"): FileImage {
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
  detail = `${operation} failed: ${reason}`
): ContentWorkspaceFailure {
  return Object.freeze({
    _tag: "ContentWorkspaceFailure",
    operation,
    reason,
    ...(path === undefined ? {} : { path }),
    detail,
  });
}

function versionedContentFailure(
  operation: VersionedContentFailure["operation"],
  reason: VersionedContentFailure["reason"],
  path?: string,
  detail = `${operation} failed: ${reason}`
): VersionedContentFailure {
  return Object.freeze({
    _tag: "VersionedContentFailure",
    operation,
    reason,
    ...(path === undefined ? {} : { path }),
    detail,
  });
}

function must<T, E>(result: ReleaseResult<T, E>): T {
  if (!result.ok)
    throw new Error(`Expected release fixture success: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function createVendorStatus(runtime: VendorHarness) {
  const client = createLifecycleTestClient({
    contentWorkspace: runtime.contentWorkspace,
    clock: runtime.clock,
    versionedContent: runtime.versionedContent,
  });
  return (request: VendorStatusRequest) => client.vendors.status(request, testInvocation);
}

function createVendorUpdate(runtime: VendorHarness) {
  const client = createLifecycleTestClient({
    contentWorkspace: runtime.contentWorkspace,
    clock: runtime.clock,
    versionedContent: runtime.versionedContent,
  });
  return (request: VendorUpdateRequest) => client.vendors.update(request, testInvocation);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
