import { describe, expect, it } from "vitest";

import {
  createVendorStatus,
  createVendorUpdate,
} from "../../../src/service/modules/vendors/internal/application";
import type {
  VendorAuthoringApplyResult,
  VendorAuthoringPlan,
  VendorContentWorkspaceRef,
  VendorDeclaredSourceObservation,
  VendorLifecycleRuntime,
  VendorPayloadPreparationQuery,
  VendorPayloadPreparationResult,
  VendorProvenanceRecord,
  VendorPreimageCaptureResult,
  VendorRestorationResult,
  VendorSourceIdentity,
  VendorUpstreamQuery,
  VendorUpstreamReadResult,
  VendorWorkspaceObservation,
  VendorWorkspaceReadResult,
} from "../../../src/service/modules/vendors/ports";
import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
} from "../../../src/service/modules/vendors/ports";

type ObservedUpstream = Extract<VendorUpstreamReadResult, { readonly kind: "Observed" }>;

const contentWorkspace: VendorContentWorkspaceRef = Object.freeze({
  locator: "/tmp/content-workspace",
  repositoryIdentity: "git:personal-rawr-hq",
  contentAuthority: "personal-rawr-hq",
  refName: "refs/heads/main",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
  releaseInputPath: ".rawr/release-input.json",
});
const observedAt = "2026-07-17T18:20:30.123Z";

describe("vendor lifecycle applications", () => {
  it("classifies declared sources while held and locally invalid sources never reach upstream", async () => {
    const harness = new VendorHarness([
      source("current"),
      source("available"),
      source("held", { policy: "held" }),
      source("drifted", { destinationDigest: digest("9") }),
      source("invalid", { provenance: null }),
      source("offline"),
    ]);
    harness.setUpstream("current", currentUpstream("current", identity("1")));
    harness.setUpstream("available", updateUpstream("available", identity("7")));
    harness.setUpstream("offline", { kind: "Unavailable", detail: "network unavailable" });

    const result = await createVendorStatus(harness)({ contentWorkspace });

    expect(result).toEqual({
      kind: "VendorStatus",
      sources: [
        expect.objectContaining({ sourceId: "current", classification: "Current" }),
        expect.objectContaining({ sourceId: "available", classification: "UpdateAvailable" }),
        expect.objectContaining({ sourceId: "held", classification: "Held", observed: null }),
        expect.objectContaining({ sourceId: "drifted", classification: "Diverged", observed: null }),
        expect.objectContaining({ sourceId: "invalid", classification: "Invalid", observed: null }),
        expect.objectContaining({ sourceId: "offline", classification: "Unavailable", observed: null }),
      ],
    });
    expect(harness.upstreamSourceIds).toEqual(["current", "available", "offline"]);
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
    expect(harness.counters.restore).toBe(0);
    expect(harness.counters.prepare).toBe(0);
  });

  it("rejects held and undeclared selections before any upstream or authoring call", async () => {
    const harness = new VendorHarness([source("tracked"), source("held", { policy: "held" })]);
    const update = createVendorUpdate(harness);

    const held = await update({ contentWorkspace, sourceIds: ["tracked", "held"] });
    expect(held).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "HeldSource", sourceId: "held" }],
    });
    expect(harness.upstreamSourceIds).toEqual([]);

    const undeclared = await update({ contentWorkspace, sourceIds: ["missing"] });
    expect(undeclared).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "UndeclaredSource", sourceId: "missing" }],
    });
    expect(harness.upstreamSourceIds).toEqual([]);
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
    expect(harness.counters.prepare).toBe(0);
  });

  it("authors the exact reviewable plan, verifies it, and stutters on repeat", async () => {
    const harness = new VendorHarness([source("upstream")]);
    const next = identity("7");
    harness.setUpstream("upstream", updateUpstream("upstream", next));
    const update = createVendorUpdate(harness);

    const first = await update({ contentWorkspace, sourceIds: ["upstream"] });

    expect(first).toEqual({
      kind: "AuthoredReviewableChanges",
      sourceIds: ["upstream"],
      changedPaths: [
        ".rawr/release-input.json",
        "plugins/cognition/skills/upstream",
        "vendor/locks/upstream.json",
        "vendor/provenance/upstream.json",
        "vendor/sources/upstream.json",
      ],
    });
    expect(harness.lastPlan?.sourceChanges).toEqual([
      expect.objectContaining({
        sourceId: "upstream",
        prior: identity("1"),
        next,
        payload: expect.objectContaining({ identity: next }),
        nextRecords: expect.objectContaining({
          declaration: expect.objectContaining({ curationRevision: 2 }),
          provenance: expect.objectContaining({
            disposition: "review-required",
            observedAt,
          }),
          lock: expect.objectContaining({ admitted: next }),
        }),
      }),
    ]);
    expect(harness.counters.capture).toBe(1);
    expect(harness.counters.apply).toBe(1);
    expect(harness.counters.restore).toBe(0);
    expect(harness.counters.prepare).toBe(1);

    harness.resetOperationCounters();
    const repeated = await update({ contentWorkspace, sourceIds: ["upstream"] });
    expect(repeated).toEqual({ kind: "ReadOnlyConverged", sourceIds: ["upstream"] });
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
    expect(harness.counters.restore).toBe(0);
    expect(harness.counters.prepare).toBe(0);
  });

  it("revalidates repository truth after upstream observation and refuses concurrent drift", async () => {
    const harness = new VendorHarness([source("upstream")]);
    harness.setUpstream("upstream", updateUpstream("upstream", identity("7")));
    harness.driftOnObservation = 2;

    const result = await createVendorUpdate(harness)({
      contentWorkspace,
      sourceIds: ["upstream"],
    });

    expect(result).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "LocalDrift" }],
    });
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
  });

  it("restores a captured preimage when authoring partially fails", async () => {
    const harness = new VendorHarness([source("upstream")]);
    harness.setUpstream("upstream", updateUpstream("upstream", identity("7")));
    harness.applyResult = {
      kind: "FailedAfterMutation",
      mutatedPaths: ["plugins/cognition/skills/upstream"],
      detail: "lock publication failed",
    };

    const result = await createVendorUpdate(harness)({
      contentWorkspace,
      sourceIds: ["upstream"],
    });

    expect(result).toMatchObject({
      kind: "FailedRestored",
      sourceIds: ["upstream"],
      issues: [{ code: "AuthoringFailed", detail: "lock publication failed" }],
    });
    expect(harness.counters.restore).toBe(1);
  });

  it("reports unsettled paths and separate restoration evidence when rollback fails", async () => {
    const harness = new VendorHarness([source("upstream")]);
    harness.setUpstream("upstream", updateUpstream("upstream", identity("7")));
    harness.applyResult = {
      kind: "FailedAfterMutation",
      mutatedPaths: ["plugins/cognition/skills/upstream"],
      detail: "payload replacement failed",
    };
    harness.restoreResult = {
      kind: "Failed",
      unsettledPaths: ["plugins/cognition/skills/upstream"],
      detail: "destination identity changed before restore",
    };

    const result = await createVendorUpdate(harness)({
      contentWorkspace,
      sourceIds: ["upstream"],
    });

    expect(result).toEqual({
      kind: "RestorationFailed",
      sourceIds: ["upstream"],
      unsettledPaths: ["plugins/cognition/skills/upstream"],
      issues: [
        { code: "AuthoringFailed", detail: "payload replacement failed" },
        { code: "RestorationFailed", detail: "destination identity changed before restore" },
      ],
    });
  });

  it("rejects payload bytes that no longer match the classified upstream tree before authoring", async () => {
    const harness = new VendorHarness([source("upstream")]);
    const next = identity("7");
    harness.setUpstream("upstream", updateUpstream("upstream", next));
    harness.setPreparation("upstream", {
      kind: "Prepared",
      payload: {
        identity: next,
        entries: [{
          path: "different.md",
          mode: "100644",
          blob: "b".repeat(40),
          bytes: new Uint8Array([1]),
        }],
      },
      observedAt,
    });

    const result = await createVendorUpdate(harness)({ contentWorkspace, sourceIds: ["upstream"] });

    expect(result).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "PayloadMismatch", sourceId: "upstream" }],
    });
    expect(harness.counters.capture).toBe(0);
    expect(harness.counters.apply).toBe(0);
  });

  it("classifies every cross-record corruption as Invalid without observing upstream", async () => {
    const baseline = source("upstream");
    const corruptions: VendorDeclaredSourceObservation[] = [
      { ...baseline, declarationContentDigest: digest("9") },
      {
        ...baseline,
        provenance: baseline.provenance === null
          ? null
          : { ...baseline.provenance, sourceId: "different" },
      },
      {
        ...baseline,
        provenance: baseline.provenance === null
          ? null
          : { ...baseline.provenance, curationRevision: 2 },
      },
      {
        ...baseline,
        provenance: baseline.provenance === null
          ? null
          : { ...baseline.provenance, supportedBaseline: "different" },
      },
      {
        ...baseline,
        provenance: baseline.provenance === null
          ? null
          : { ...baseline.provenance, disposition: "held" },
      },
      {
        ...baseline,
        provenance: baseline.provenance === null
          ? null
          : { ...baseline.provenance, observedAt: "2026-02-30T00:00:00Z" },
      },
      {
        ...baseline,
        lock: baseline.lock === null ? null : { ...baseline.lock, sourceId: "different" },
      },
      {
        ...baseline,
        lock: baseline.lock === null
          ? null
          : { ...baseline.lock, admitted: identity("8") },
      },
    ];

    for (const corrupted of corruptions) {
      const harness = new VendorHarness([corrupted]);
      const result = await createVendorStatus(harness)({ contentWorkspace });
      expect(result).toMatchObject({
        kind: "VendorStatus",
        sources: [{ sourceId: "upstream", classification: "Invalid" }],
      });
      expect(harness.counters.upstream).toBe(0);
      expect(harness.counters.capture).toBe(0);
    }
  });

  it("blocks authoring when operation-private upstream cleanup cannot be proven", async () => {
    const observeCleanupFailure = new VendorHarness([source("upstream")]);
    observeCleanupFailure.setUpstream("upstream", {
      kind: "CleanupFailed",
      detail: "private candidate identity changed before guarded cleanup",
    });
    const rejectedObservation = await createVendorUpdate(observeCleanupFailure)({
      contentWorkspace,
      sourceIds: ["upstream"],
    });
    expect(rejectedObservation).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "CleanupFailed", sourceId: "upstream" }],
    });
    expect(observeCleanupFailure.counters.prepare).toBe(0);
    expect(observeCleanupFailure.counters.capture).toBe(0);

    const prepareCleanupFailure = new VendorHarness([source("upstream")]);
    prepareCleanupFailure.setUpstream("upstream", updateUpstream("upstream", identity("7")));
    prepareCleanupFailure.setPreparation("upstream", {
      kind: "CleanupFailed",
      detail: "private candidate was preserved because containment changed",
    });
    const rejectedPreparation = await createVendorUpdate(prepareCleanupFailure)({
      contentWorkspace,
      sourceIds: ["upstream"],
    });
    expect(rejectedPreparation).toMatchObject({
      kind: "Rejected",
      issues: [{ code: "CleanupFailed", sourceId: "upstream" }],
    });
    expect(prepareCleanupFailure.counters.prepare).toBe(1);
    expect(prepareCleanupFailure.counters.capture).toBe(0);
  });

  it("restores when post-write records or binding digests do not match the exact service plan", async () => {
    const harness = new VendorHarness([source("upstream")]);
    harness.setUpstream("upstream", updateUpstream("upstream", identity("7")));
    harness.corruptAppliedBinding = true;

    const result = await createVendorUpdate(harness)({
      contentWorkspace,
      sourceIds: ["upstream"],
    });

    expect(result).toMatchObject({
      kind: "FailedRestored",
      issues: [{ code: "AuthoringFailed" }],
    });
    expect(harness.counters.restore).toBe(1);
  });
});

class VendorHarness implements VendorLifecycleRuntime {
  readonly counters = {
    repository: 0,
    upstream: 0,
    prepare: 0,
    capture: 0,
    apply: 0,
    restore: 0,
  };
  readonly upstreamSourceIds: string[] = [];
  readonly repository = {
    observe: async (): Promise<VendorWorkspaceReadResult> => {
      this.counters.repository += 1;
      if (this.driftOnObservation === this.counters.repository) {
        return {
          kind: "Observed",
          observation: { ...this.observation, snapshotDigest: digest("8") },
        };
      }
      return { kind: "Observed", observation: this.observation };
    },
  };
  readonly upstream = {
    observe: async (query: VendorUpstreamQuery): Promise<VendorUpstreamReadResult> => {
      this.counters.upstream += 1;
      this.upstreamSourceIds.push(query.sourceId);
      const configured = this.upstreams.get(query.sourceId);
      if (configured === undefined) {
        return { kind: "Unavailable", detail: `No upstream fixture for ${query.sourceId}` };
      }
      return configured.kind === "Observed" && sameIdentity(configured.identity, query.admitted)
        ? { ...configured, ancestry: "same" }
        : configured;
    },
    prepare: async (query: VendorPayloadPreparationQuery): Promise<VendorPayloadPreparationResult> => {
      this.counters.prepare += 1;
      const configured = this.preparations.get(query.sourceId);
      if (configured !== undefined) return configured;
      return {
        kind: "Prepared",
        payload: {
          identity: query.expected,
          entries: query.expectedEntries.map((entry) => ({
            ...entry,
            bytes: new TextEncoder().encode(entry.path),
          })),
        },
        observedAt,
      };
    },
  };
  readonly authoring = {
    capture: async (plan: VendorAuthoringPlan): Promise<VendorPreimageCaptureResult> => {
      this.counters.capture += 1;
      this.lastPlan = plan;
      return { kind: "Captured", preimageHandle: "preimage-1" };
    },
    apply: async (plan: VendorAuthoringPlan): Promise<VendorAuthoringApplyResult> => {
      this.counters.apply += 1;
      if (this.applyResult !== undefined) return this.applyResult;
      this.observation = applyPlan(this.observation, plan);
      if (this.corruptAppliedBinding) {
        this.observation = {
          ...this.observation,
          sources: this.observation.sources.map((observed) => ({
            ...observed,
            provenanceContentDigest: digest("9"),
          })),
        };
      }
      return { kind: "Applied", changedPaths: plan.changedPaths };
    },
    restore: async (plan: VendorAuthoringPlan): Promise<VendorRestorationResult> => {
      this.counters.restore += 1;
      return this.restoreResult ?? { kind: "Restored", restoredPaths: plan.changedPaths };
    },
  };

  observation: VendorWorkspaceObservation;
  lastPlan: VendorAuthoringPlan | undefined;
  applyResult: VendorAuthoringApplyResult | undefined;
  restoreResult: VendorRestorationResult | undefined;
  driftOnObservation: number | undefined;
  corruptAppliedBinding = false;
  private readonly upstreams = new Map<string, VendorUpstreamReadResult>();
  private readonly preparations = new Map<string, VendorPayloadPreparationResult>();

  constructor(sources: readonly VendorDeclaredSourceObservation[]) {
    this.observation = {
      contentWorkspace: {
        repositoryIdentity: contentWorkspace.repositoryIdentity,
        contentAuthority: contentWorkspace.contentAuthority,
        refName: contentWorkspace.refName,
        sourceCommit: contentWorkspace.sourceCommit,
        sourceTree: contentWorkspace.sourceTree,
        releaseInputPath: contentWorkspace.releaseInputPath,
      },
      snapshotDigest: digest("0"),
      sources,
    };
  }

  setUpstream(selectedSourceId: string, result: VendorUpstreamReadResult): void {
    this.upstreams.set(selectedSourceId, result);
  }

  setPreparation(selectedSourceId: string, result: VendorPayloadPreparationResult): void {
    this.preparations.set(selectedSourceId, result);
  }

  resetOperationCounters(): void {
    this.counters.capture = 0;
    this.counters.apply = 0;
    this.counters.restore = 0;
    this.counters.prepare = 0;
  }
}

function source(
  selectedSourceId: string,
  options: Readonly<{
    policy?: "tracked" | "held";
    provenance?: VendorProvenanceRecord | null;
    destinationDigest?: string;
  }> = {},
): VendorDeclaredSourceObservation {
  const admitted = identity("1");
  const declarationContentDigest = digest("3");
  const provenanceContentDigest = digest("4");
  const lockContentDigest = digest("5");
  const policy = options.policy ?? "tracked";
  return {
    memberPluginId: "cognition",
    declarationBinding: {
      id: `vendor/sources/${selectedSourceId}.json`,
      protocol: VENDOR_SOURCE_PROTOCOL,
      contentDigest: declarationContentDigest,
    },
    declarationContentDigest,
    declaration: {
      schemaVersion: 1,
      sourceId: selectedSourceId,
      policy,
      repositoryIdentity: admitted.repositoryIdentity,
      refName: admitted.refName,
      sourcePath: `skills/${selectedSourceId}`,
      destinationPath: `plugins/cognition/skills/${selectedSourceId}`,
      provenancePath: `vendor/provenance/${selectedSourceId}.json`,
      lockPath: `vendor/locks/${selectedSourceId}.json`,
      curationRevision: 1,
      supportedBaseline: "codex>=0.144.5",
    },
    provenanceBinding: {
      id: `vendor/provenance/${selectedSourceId}.json`,
      protocol: VENDOR_PROVENANCE_PROTOCOL,
      contentDigest: provenanceContentDigest,
    },
    provenanceContentDigest,
    provenance: options.provenance === undefined ? {
      schemaVersion: 1,
      sourceId: selectedSourceId,
      admitted,
      importedPayloadDigest: admitted.payloadDigest,
      curationRevision: 1,
      supportedBaseline: "codex>=0.144.5",
      observedLatest: admitted,
      observedAt,
      disposition: policy === "held" ? "held" : "admitted",
    } : options.provenance,
    lockBinding: {
      id: `vendor/locks/${selectedSourceId}.json`,
      protocol: VENDOR_LOCK_PROTOCOL,
      contentDigest: lockContentDigest,
    },
    lockContentDigest,
    lock: { schemaVersion: 1, sourceId: selectedSourceId, admitted },
    destination: { kind: "Present", payloadDigest: options.destinationDigest ?? admitted.payloadDigest },
  };
}

function identity(seed: string): VendorSourceIdentity {
  return {
    repositoryIdentity: "git:vendor-upstream",
    refName: "refs/heads/main",
    sourceCommit: seed.repeat(40),
    sourceTree: seed.repeat(40),
    payloadDigest: digest(seed),
  };
}

function currentUpstream(selectedSourceId: string, observed: VendorSourceIdentity): ObservedUpstream {
  return {
    kind: "Observed",
    repositoryIdentity: observed.repositoryIdentity,
    refName: observed.refName,
    sourcePath: `skills/${selectedSourceId}`,
    identity: observed,
    observedAt,
    ancestry: "same",
    entries: [{ path: "SKILL.md", mode: "100644", blob: "a".repeat(40) }],
  };
}

function updateUpstream(
  selectedSourceId: string,
  observed: VendorSourceIdentity,
): ObservedUpstream {
  return {
    kind: "Observed",
    repositoryIdentity: observed.repositoryIdentity,
    refName: observed.refName,
    sourcePath: `skills/${selectedSourceId}`,
    identity: observed,
    observedAt,
    ancestry: "fast-forward",
    entries: [{ path: "SKILL.md", mode: "100644", blob: "a".repeat(40) }],
  };
}

function applyPlan(
  observation: VendorWorkspaceObservation,
  plan: VendorAuthoringPlan,
): VendorWorkspaceObservation {
  const changes = new Map(plan.sourceChanges.map((change) => [change.sourceId, change]));
  return {
    ...observation,
    snapshotDigest: digest("f"),
    sources: observation.sources.map((observed) => {
      const change = changes.get(observed.declaration.sourceId);
      return change === undefined
        ? observed
        : {
            ...observed,
            declaration: change.nextRecords.declaration,
            declarationBinding: {
              ...observed.declarationBinding,
              contentDigest: digest("6"),
            },
            declarationContentDigest: digest("6"),
            provenance: change.nextRecords.provenance,
            provenanceBinding: {
              ...change.provenanceBinding,
              contentDigest: digest("7"),
            },
            provenanceContentDigest: digest("7"),
            lock: change.nextRecords.lock,
            lockBinding: {
              ...change.lockBinding,
              contentDigest: digest("8"),
            },
            lockContentDigest: digest("8"),
            destination: { kind: "Present", payloadDigest: change.next.payloadDigest },
          };
    }),
  };
}

function sameIdentity(left: VendorSourceIdentity, right: VendorSourceIdentity): boolean {
  return left.repositoryIdentity === right.repositoryIdentity
    && left.refName === right.refName
    && left.sourceCommit === right.sourceCommit
    && left.sourceTree === right.sourceTree
    && left.payloadDigest === right.payloadDigest;
}

function digest(seed: string): string {
  return `sha256_${seed.repeat(64)}`;
}
