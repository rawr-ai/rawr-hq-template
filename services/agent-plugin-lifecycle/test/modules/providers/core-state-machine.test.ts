import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type ArtifactRef,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import { describe, expect, it } from "vitest";

import { productFixture } from "../../shared/release/fixtures";
import {
  createCompleteTest,
  createCanonicalStatus,
  createCanonicalSync,
  createManagedRetire,
  createProviderMarketplaceRegistration,
  createProviderInventory,
  createTargetReceipt,
  createTargetedTest,
  decodeMechanicalProviderEvidence,
  hasProjectionExposureCollision,
  mechanicalTargetFactDigest,
  marketplaceState,
  parseAdapterProtocol,
  parseProviderTarget,
  renderCompleteProjection,
  visibleFingerprint,
  type CanonicalChannelResolution,
  type CanonicalStatusDependencies,
  type CanonicalSyncDependencies,
  type CompleteTestDependencies,
  type LifecycleRecordDigest,
  type ManagedRetireDependencies,
  type MechanicalEvidenceHandle,
  type MechanicalEvidenceObservation,
  type MechanicalProviderEvidence,
  type NativeMemberObservation,
  type NativeProviderMutationAction,
  type NativeStandaloneExposureObservation,
  type ProviderArtifactAuthority,
  type ProviderCapability,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
  type ProviderMutationAction,
  type ProviderSourceIdentity,
  type ProviderTarget,
  type ReceiptObservation,
  type TargetIdentityObservation,
  type TargetReceipt,
  type TargetedTestDependencies,
} from "../../../src/service/modules/providers/internal";
import { failure, issue, success } from "../../../src/service/modules/providers/internal/domain/result";

describe("provider deployment state machine", () => {
  it("reads live truth on repeat while every mutation, capsule, receipt, sidecar, and evidence write stays at zero", async () => {
    const harness = new Harness();
    const app = createCompleteTest(() => harness.completeDependencies());
    const first = await app(harness.completeRequest([CODEX_A]));
    expect(first.ok && first.value.status).toBe("Mutated");
    expect(harness.receiptFor(CODEX_A)).not.toBeNull();
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);
    expect(harness.counters.projectionMaterializations).toBe(1);
    expect(harness.counters.marketplaceMaterializations).toBe(1);
    expect(harness.counters.marketplaceWrites).toBe(1);

    harness.resetCounters();
    const second = await app(harness.completeRequest([CODEX_A]));
    expect(second.ok && second.value.status).toBe("ReadOnlyConverged");
    expect(harness.counters.capabilityReads).toBeGreaterThan(0);
    expect(harness.counters.inventoryReads).toBeGreaterThan(0);
    expect(harness.counters.visibilityReads).toBeGreaterThan(0);
    expect(harness.counters.receiptReads).toBeGreaterThan(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.identityWrites).toBe(0);
    expect(harness.counters.capsulePreflights).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
    expect(harness.counters.evidencePublishes).toBe(0);
    expect(harness.counters.projectionMaterializations).toBe(0);
    expect(harness.counters.marketplaceMaterializations).toBe(0);
    expect(harness.counters.marketplaceWrites).toBe(0);
  });

  it("keeps a target receipt stable when peer targets leave the next invocation", async () => {
    const harness = new Harness();
    const app = createCompleteTest(() => harness.completeDependencies());
    const first = await app(harness.completeRequest([CODEX_A, CODEX_B]));
    expect(first.ok && first.value.status).toBe("Mutated");
    const prior = harness.receiptFor(CODEX_A);
    if (prior === null) throw new Error("target-local receipt fixture missing");

    harness.resetCounters();
    const repeated = await app(harness.completeRequest([CODEX_A]));
    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(prior.receiptDigest);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it("keeps a canonical receipt stable across equivalent clean checkout locators", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    const prior = harness.receiptFor(CODEX_A);
    if (prior === null) throw new Error("canonical receipt fixture missing");

    harness.resetCounters();
    const repeated = await createCanonicalSync(() => harness.canonicalDependencies())({
      kind: "canonical-sync",
      channel: "current-main",
      locator: {
        repositoryIdentity: LOCATOR.repositoryIdentity,
        workspaceRoot: "/tmp/another-clean-personal-rawr-hq",
      },
      targets: [CODEX_A],
    });
    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(prior.receiptDigest);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it("mints a receipt successor after repairing missing native state and then converges read-only", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    const prior = harness.receiptFor(CODEX_A);
    if (prior === null) throw new Error("prior receipt fixture missing");
    harness.removeLiveMember(CODEX_A, "beta");

    harness.resetCounters();
    const repaired = await canonicalSync(harness);
    expect(repaired.ok && repaired.value.status).toBe("Mutated");
    const next = harness.receiptFor(CODEX_A);
    if (next === null) throw new Error("successor receipt fixture missing");
    expect(next.body.generation).toBe(prior.body.generation + 1);
    expect(next.body.lineage).toEqual({ kind: "successor", priorReceiptDigest: prior.receiptDigest });
    expect(harness.counters.nativeMutations).toBeGreaterThan(0);
    expect(harness.counters.receiptWrites).toBe(1);

    harness.resetCounters();
    const repeated = await canonicalSync(harness);
    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
  });

  it("refreshes a changed enabled member through typed retire then install before receipt", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    harness.seedPriorReleaseReceipt(CODEX_A);

    harness.resetCounters();
    const repaired = await canonicalSync(harness);
    expect(repaired.ok && repaired.value.status).toBe("Mutated");
    if (!repaired.ok) return;
    const actions = repaired.value.targets[0]?.events.flatMap((event) =>
      event.phase === "applied" ? [event.action] : []) ?? [];
    expect(actions.map((action) => action.kind)).toEqual([
      "RetireMember",
      "SetMarketplace",
      "InstallMember",
      "PublishReceipt",
    ]);
    const retire = actions[0];
    const install = actions[2];
    expect(retire).toMatchObject({ kind: "RetireMember", prior: { pluginId: "alpha", enablement: "enabled" } });
    expect(install).toMatchObject({ kind: "InstallMember", member: { pluginId: "alpha" } });
    if (retire?.kind !== "RetireMember" || install?.kind !== "InstallMember") return;
    expect(retire.prior.memberFingerprint).not.toBe(install.member.memberFingerprint);
    expect(repaired.value.targets[0]?.events.findIndex((event) => event.phase === "retired"))
      .toBeLessThan(repaired.value.targets[0]?.events.findIndex((event) =>
        event.phase === "applied" && event.action.kind === "InstallMember") ?? -1);
  });

  it("rejects enable and retire before capsule or provider mutation when exact prior bytes are unavailable", async () => {
    const enableHarness = new Harness();
    expect((await canonicalSync(enableHarness)).ok).toBe(true);
    enableHarness.driftDisabledMember(CODEX_A, "alpha");
    enableHarness.dropArchivedSource(CODEX_A, "alpha");
    enableHarness.resetCounters();

    const enabled = await canonicalSync(enableHarness);
    expect(enabled.ok && enabled.value.status).toBe("Failed");
    expect(enableHarness.counters.inverseSourceReads).toBeGreaterThan(0);
    expect(enableHarness.counters.nativeMutations).toBe(0);
    expect(enableHarness.counters.capsulePreflights).toBe(0);
    expect(enableHarness.counters.capsuleBegins).toBe(0);

    const retireHarness = new Harness();
    expect((await canonicalSync(retireHarness)).ok).toBe(true);
    retireHarness.dropArchivedSource(CODEX_A, "alpha");
    retireHarness.resetCounters();
    const retired = await createManagedRetire(() => retireHarness.retireDependencies())({
      kind: "managed-retire",
      pluginId: "alpha",
      targets: [CODEX_A],
    });
    expect(retired.ok && retired.value.status).toBe("Failed");
    expect(retireHarness.counters.inverseSourceReads).toBe(1);
    expect(retireHarness.counters.nativeMutations).toBe(0);
    expect(retireHarness.counters.capsulePreflights).toBe(0);
    expect(retireHarness.counters.capsuleBegins).toBe(0);
  });

  it("does not recreate a receipt or target identity from unclaimed live state", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    harness.receipts.delete(CODEX_A.home);
    harness.identities.delete(CODEX_A.home);

    harness.resetCounters();
    const published = await canonicalSync(harness);
    expect(published.ok && published.value.status).toBe("Blocked");
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.identityWrites).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it("preserves omitted managed members in targeted tests", async () => {
    const harness = new Harness();
    const complete = await createCompleteTest(() => harness.completeDependencies())(harness.completeRequest([CODEX_A]));
    expect(complete.ok).toBe(true);
    const completeProjectionDigest = harness.receiptFor(CODEX_A)?.body.scope.projectionDigest;
    const completeMarketplaceDigest = harness.marketplaceDigestFor(CODEX_A);
    const targetedRequest = {
      kind: "targeted-test",
      releases: [harness.alphaRef],
      evaluationProfile: "provider-smoke@v1",
      targets: [CODEX_A],
    } as const;
    harness.resetCounters();
    const targeted = await createTargetedTest(() => harness.targetedDependencies())(targetedRequest);
    expect(targeted.ok).toBe(true);
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.marketplaceWrites).toBe(1);
    expect(harness.counters.receiptWrites).toBe(1);
    expect(harness.receiptFor(CODEX_A)?.body.managedMembers.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);
    const claims = harness.receiptFor(CODEX_A)?.body.managedMembers;
    expect(claims?.find((claim) => claim.pluginId === "alpha")?.sourceProjectionDigest).not.toBe(completeProjectionDigest);
    expect(claims?.find((claim) => claim.pluginId === "beta")?.sourceProjectionDigest).toBe(completeProjectionDigest);
    const registrationAction = targeted.ok
      ? targeted.value.targets[0]?.events.flatMap((event) =>
        event.phase === "applied" && event.action.kind === "SetMarketplace" ? [event.action] : [])[0]
      : undefined;
    expect(registrationAction?.kind).toBe("SetMarketplace");
    if (registrationAction?.kind === "SetMarketplace") {
      expect(registrationAction.priorRegistration?.projectionDigest).toBe(completeMarketplaceDigest);
      expect(registrationAction.registration?.members.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);
      expect(registrationAction.registration?.members.find((member) => member.pluginId === "alpha")?.sourceProjectionDigest).not.toBe(completeProjectionDigest);
      expect(registrationAction.registration?.members.find((member) => member.pluginId === "beta")?.sourceProjectionDigest).toBe(completeProjectionDigest);
    }
    expect(harness.marketplaceDigestFor(CODEX_A)).toBe(harness.receiptFor(CODEX_A)?.body.marketplace.projectionDigest);

    harness.resetCounters();
    const repeatedTargeted = await createTargetedTest(() => harness.targetedDependencies())(targetedRequest);
    expect(repeatedTargeted.ok && repeatedTargeted.value.status).toBe("ReadOnlyConverged");
    expect(harness.counters.marketplaceWrites).toBe(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);

    harness.resetCounters();
    const retired = await createManagedRetire(() => harness.retireDependencies())({
      kind: "managed-retire",
      pluginId: "beta",
      targets: [CODEX_A],
    });
    expect(retired.ok && retired.value.status).toBe("Mutated");
    const retireAction = retired.ok
      ? retired.value.targets[0]?.events.flatMap((event) =>
        event.phase === "applied" && event.action.kind === "RetireMember" ? [event.action] : [])[0]
      : undefined;
    expect(retireAction?.kind).toBe("RetireMember");
    if (retireAction?.kind === "RetireMember") {
      expect(retireAction.priorProjectionDigest).toBe(completeProjectionDigest);
      expect(retireAction.activeMarketplace?.members.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);
    }
    expect(retired.ok ? retired.value.targets[0]?.events.flatMap((event) =>
      event.phase === "applied" ? [event.action.kind] : []) : []).toEqual([
      "RetireMember",
      "SetMarketplace",
      "PublishReceipt",
    ]);
    expect(harness.counters.marketplaceWrites).toBe(1);
    expect(harness.marketplaceDigestFor(CODEX_A)).toBe(harness.receiptFor(CODEX_A)?.body.marketplace.projectionDigest);
  });

  it.each(["drop-beta", "change-beta"] as const)(
    "refuses targeted convergence when marketplace mutation side effects %s",
    async (sideEffect) => {
      const harness = new Harness();
      expect((await createCompleteTest(() => harness.completeDependencies())(
        harness.completeRequest([CODEX_A]),
      )).ok).toBe(true);
      const priorReceipt = harness.receiptFor(CODEX_A)?.receiptDigest;
      harness.marketplaceSideEffect = sideEffect;
      harness.resetCounters();

      const targeted = await createTargetedTest(() => harness.targetedDependencies())({
        kind: "targeted-test",
        releases: [harness.alphaRef],
        evaluationProfile: "provider-smoke@v1",
        targets: [CODEX_A],
      });

      expect(targeted.ok && targeted.value.status).toBe("Failed");
      expect(harness.counters.marketplaceWrites).toBe(1);
      expect(harness.counters.receiptWrites).toBe(0);
      expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(priorReceipt);
    },
  );

  it("blocks effective marketplace materialization before capsule when a preserved member archive is missing", async () => {
    const harness = new Harness();
    expect((await createCompleteTest(() => harness.completeDependencies())(harness.completeRequest([CODEX_A]))).ok).toBe(true);
    const priorReceipt = harness.receiptFor(CODEX_A)?.receiptDigest;
    const priorMarketplace = harness.marketplaceDigestFor(CODEX_A);
    harness.dropArchivedSource(CODEX_A, "beta");
    harness.resetCounters();

    const result = await createTargetedTest(() => harness.targetedDependencies())({
      kind: "targeted-test",
      releases: [harness.alphaRef],
      evaluationProfile: "provider-smoke@v1",
      targets: [CODEX_A],
    });
    expect(result.ok && result.value.status).toBe("Failed");
    expect(harness.counters.marketplaceMaterializations).toBe(1);
    expect(harness.counters.capsulePreflights).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
    expect(harness.counters.marketplaceWrites).toBe(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(priorReceipt);
    expect(harness.marketplaceDigestFor(CODEX_A)).toBe(priorMarketplace);
  });

  it.each(["projection", "marketplace"] as const)(
    "isolates one provider %s materialization failure from an eligible target",
    async (failureKind) => {
      const harness = new Harness();
      const failedTargetBefore = harness.liveStateFor(CODEX_A);
      if (failureKind === "projection") harness.failProjectionMaterializationProvider = "codex";
      else harness.failMarketplaceMaterializationProvider = "codex";

      const result = await createCompleteTest(() => harness.completeDependencies())(
        harness.completeRequest([CODEX_A, CLAUDE_A]),
      );

      expect(result.ok && result.value.status).toBe("PartialFailure");
      if (!result.ok) return;
      expect(result.value.targets.find((target) => target.target.provider === "codex")?.status).toBe("failed");
      expect(result.value.targets.find((target) => target.target.provider === "claude")?.status).toBe("mutated");
      expect(harness.liveStateFor(CODEX_A)).toEqual(failedTargetBefore);
      expect(harness.memberIds(CLAUDE_A)).toEqual(["alpha", "beta"]);
      expect(harness.receiptFor(CODEX_A)).toBeNull();
      expect(harness.receiptFor(CLAUDE_A)).not.toBeNull();
      expect(harness.providerMutationAttemptsFor(CODEX_A)).toEqual([]);
      expect(harness.capsuleStagesFor(CODEX_A)).toEqual([]);
      expect(harness.capsuleAppliedFor(CODEX_A)).toEqual([]);
      expect(harness.identityAdmissionsFor(CODEX_A)).toEqual([]);
    },
  );

  it("isolates one target inverse-source failure from an eligible target", async () => {
    const harness = new Harness();
    expect((await createCompleteTest(() => harness.completeDependencies())(
      harness.completeRequest([CODEX_A, CLAUDE_A]),
    )).ok).toBe(true);
    const codexPriorProjection = `ap1_${"e".repeat(64)}` as import("../../../src/service/modules/providers/internal").ProjectionDigest;
    const claudePriorProjection = `ap1_${"d".repeat(64)}` as import("../../../src/service/modules/providers/internal").ProjectionDigest;
    harness.seedPriorReleaseReceipt(CODEX_A, codexPriorProjection);
    harness.seedPriorReleaseReceipt(CLAUDE_A, claudePriorProjection);
    harness.failInverseProjectionDigest = codexPriorProjection;
    harness.resetCounters();
    const codexBefore = harness.liveStateFor(CODEX_A);
    const codexReceiptBefore = harness.receiptFor(CODEX_A);

    const result = await createCompleteTest(() => harness.completeDependencies())(
      harness.completeRequest([CODEX_A, CLAUDE_A]),
    );

    expect(result.ok && result.value.status).toBe("PartialFailure");
    if (!result.ok) return;
    expect(result.value.targets.find((target) => target.target.provider === "codex")?.status).toBe("failed");
    expect(result.value.targets.find((target) => target.target.provider === "claude")?.status).toBe("mutated");
    expect(harness.liveStateFor(CODEX_A)).toEqual(codexBefore);
    expect(harness.receiptFor(CODEX_A)).toEqual(codexReceiptBefore);
    expect(harness.receiptFor(CLAUDE_A)?.body.scope.projectionDigest).not.toBe(claudePriorProjection);
    expect(harness.providerMutationAttemptsFor(CODEX_A)).toEqual([]);
    expect(harness.capsuleStagesFor(CODEX_A)).toEqual([]);
    expect(harness.capsuleAppliedFor(CODEX_A)).toEqual([]);
    expect(harness.identityAdmissionsFor(CODEX_A)).toEqual([]);
  });

  it("preserves an omitted prior claim in complete-test mode without cleanup or authority escalation", async () => {
    const harness = new Harness();
    const app = createCompleteTest(() => harness.completeDependencies());
    const request = harness.completeRequestFor(harness.alphaOnlyCompleteSnapshot, [CODEX_A]);
    expect((await app(request)).ok).toBe(true);
    harness.addStaleReceiptClaim(CODEX_A, "beta", true);

    harness.resetCounters();
    const repeated = await app(request);
    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);
    expect(harness.receiptFor(CODEX_A)?.body.managedMembers.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);
    expect(harness.receiptFor(CODEX_A)?.body.scope.kind).toBe("complete-test");
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it.each(["targeted", "complete"] as const)(
    "blocks %s test mode from reclassifying a canonical receipt",
    async (mode) => {
      const harness = new Harness();
      expect((await canonicalSync(harness)).ok).toBe(true);
      harness.resetCounters();

      const result = mode === "targeted"
        ? await createTargetedTest(() => harness.targetedDependencies())({
          kind: "targeted-test",
          releases: [harness.alphaRef],
          evaluationProfile: "provider-smoke@v1",
          targets: [CODEX_A],
        })
        : await createCompleteTest(() => harness.completeDependencies())(harness.completeRequest([CODEX_A]));
      expect(result.ok && result.value.status).toBe("Blocked");
      expect(harness.counters.inventoryReads).toBeGreaterThan(0);
      expect(harness.counters.receiptReads).toBeGreaterThan(0);
      expect(harness.counters.nativeMutations).toBe(0);
      expect(harness.counters.receiptWrites).toBe(0);
      expect(harness.counters.identityWrites).toBe(0);
      expect(harness.counters.capsuleBegins).toBe(0);
    },
  );

  it("preserves unrelated standalone skills and hooks across convergence", async () => {
    const harness = new Harness();
    harness.addUnrelatedStandaloneExposure(CODEX_A);

    const first = await canonicalSync(harness);
    expect(first.ok && first.value.status).toBe("Mutated");
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);
    expect(harness.standaloneExposures.get(CODEX_A.home)).toHaveLength(1);

    harness.resetCounters();
    const repeated = await canonicalSync(harness);
    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.standaloneExposures.get(CODEX_A.home)).toHaveLength(1);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it.each(["native", "skill"] as const)(
    "blocks a standalone %s collision before capsule or provider mutation",
    async (claim) => {
      const harness = new Harness();
      harness.addDesiredStandaloneCollision(CODEX_A, claim);

      const result = await canonicalSync(harness);
      expect(result.ok && result.value.status).toBe("Blocked");
      expect(harness.memberIds(CODEX_A)).toEqual([]);
      expect(harness.counters.nativeMutations).toBe(0);
      expect(harness.counters.receiptWrites).toBe(0);
      expect(harness.counters.identityWrites).toBe(0);
      expect(harness.counters.capsulePreflights).toBe(0);
      expect(harness.counters.capsuleBegins).toBe(0);
      expect(harness.counters.projectionMaterializations).toBe(0);
    },
  );

  it("detects a standalone hook collision in pure preflight", () => {
    const harness = new Harness();
    harness.syntheticDesiredHook = true;
    harness.addDesiredStandaloneCollision(CODEX_A, "hook");
    const target = mustTarget(CODEX_A);
    const inventory = createProviderInventory(
      target,
      [],
      harness.standaloneExposures.get(CODEX_A.home) ?? [],
    );

    expect(hasProjectionExposureCollision(inventory, harness.projectionForTest())).toBe(true);
    expect(harness.counters.inventoryReads).toBe(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it("blocks a desired plugin ID under another native identity before every write", async () => {
    const harness = new Harness();
    harness.seedDesiredPluginIdCollision(CODEX_A);

    const result = await canonicalSync(harness);
    expect(result.ok && result.value.status).toBe("Blocked");
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha"]);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.identityWrites).toBe(0);
    expect(harness.counters.capsulePreflights).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it("keeps home A truthful when home B fails after all plans are read", async () => {
    const harness = new Harness();
    harness.failInstallHome = CODEX_B.home;
    const result = await createCompleteTest(() => harness.completeDependencies())(harness.completeRequest([CODEX_B, CODEX_A]));
    expect(result.ok && result.value.status).toBe("PartialFailure");
    if (!result.ok) return;
    const byHome = new Map<string, (typeof result.value.targets)[number]>(
      result.value.targets.map((target) => [target.target.home, target]),
    );
    expect(byHome.get(CODEX_A.home)?.status).toBe("mutated");
    expect(byHome.get(CODEX_B.home)?.status).toBe("failed");
    expect(harness.receiptFor(CODEX_A)).not.toBeNull();
    expect(harness.receiptFor(CODEX_B)).toBeNull();
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);
    expect(harness.counters.inventoryReads).toBe(3);
    expect(result.value.evidence).not.toBeNull();
  });

  it("retains a selected target capability-read failure in aggregate evidence", async () => {
    const harness = new Harness();
    harness.failCapabilityReadHome = CODEX_B.home;
    const result = await createCompleteTest(() => harness.completeDependencies())(
      harness.completeRequest([CODEX_A, CODEX_B]),
    );
    expect(result.ok && result.value.status).toBe("PartialFailure");
    if (!result.ok || result.value.evidence === null) return;

    const decoded = decodeMechanicalProviderEvidence(
      harness.evidenceBytes(result.value.evidence),
      result.value.evidence,
    );
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.body.targets).toHaveLength(2);
    const failedTarget = decoded.value.body.targets.find((fact) =>
      fact.targetDigest === mustTarget(CODEX_B).targetDigest);
    expect(failedTarget).toMatchObject({
      kind: "failed",
      failureCodes: ["CAPABILITY_MISMATCH"],
    });
  });

  it("publishes the digest preimage and verifies full target facts without transaction history", async () => {
    const harness = new Harness();
    const result = await createCompleteTest(() => harness.completeDependencies())(harness.completeRequest([CODEX_A]));
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.evidence === null) return;
    const bytes = harness.evidenceBytes(result.value.evidence);
    const decoded = decodeMechanicalProviderEvidence(bytes, result.value.evidence);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.body.targets).toHaveLength(1);
    expect(mechanicalTargetFactDigest(decoded.value.body.targets[0]!)).toMatch(/^mtf1_[0-9a-f]{64}$/u);
    const tampered = new Uint8Array(bytes);
    tampered[tampered.length - 2] = tampered[tampered.length - 2]! ^ 1;
    expect(decodeMechanicalProviderEvidence(tampered, result.value.evidence).ok).toBe(false);
  });

  it("retries failed evidence publication from the identical read-only preimage", async () => {
    const harness = new Harness();
    const app = createCompleteTest(() => harness.completeDependencies());
    harness.failEvidencePublish = true;
    const failed = await app(harness.completeRequest([CODEX_A]));
    expect(failed.ok && failed.value.status).toBe("PartialFailure");
    const attempt = harness.lastEvidenceAttempt;
    if (attempt === null) throw new Error("evidence attempt fixture missing");
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);

    harness.failEvidencePublish = false;
    harness.resetCounters();
    const retried = await app(harness.completeRequest([CODEX_A]));
    expect(retried.ok && retried.value.status).toBe("ReadOnlyConverged");
    expect(retried.ok && retried.value.evidence).toBe(attempt.evidenceDigest);
    expect(harness.evidenceBytes(attempt.evidenceDigest)).toEqual(attempt.bytes);
    expect(harness.counters.capabilityReads).toBeGreaterThan(0);
    expect(harness.counters.inventoryReads).toBeGreaterThan(0);
    expect(harness.counters.visibilityReads).toBeGreaterThan(0);
    expect(harness.counters.receiptReads).toBeGreaterThan(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.identityWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
    expect(harness.counters.evidencePublishes).toBe(1);
  });

  it("classifies the complete canonical status decision table without mutation", async () => {
    const contentAhead = new Harness();
    contentAhead.channelKind = "content-ahead-of-acceptance";
    expect(await canonicalStatus(contentAhead)).toBe("CONTENT_AHEAD_OF_ACCEPTANCE");

    const blockedAuthority = new Harness();
    blockedAuthority.channelKind = "blocked-acceptance-authority";
    const blockedAuthorityStatus = await canonicalStatusOutcome(blockedAuthority);
    expect(blockedAuthorityStatus.status).toBe("CONTENT_AHEAD_OF_ACCEPTANCE");
    expect(blockedAuthorityStatus.issues).toContainEqual(expect.objectContaining({
      code: "CHANNEL_NOT_ELIGIBLE",
      actual: "blocked-acceptance-authority",
    }));

    const pending = new Harness();
    expect(await canonicalStatus(pending)).toBe("ACCEPTED_PENDING_CONVERGENCE");

    const converged = new Harness();
    expect((await canonicalSync(converged)).ok).toBe(true);
    converged.resetCounters();
    expect(await canonicalStatus(converged)).toBe("CONVERGED");

    const absentMarketplace = new Harness();
    expect((await canonicalSync(absentMarketplace)).ok).toBe(true);
    absentMarketplace.setMarketplaceAbsent(CODEX_A);
    absentMarketplace.resetCounters();
    expect(await canonicalStatus(absentMarketplace)).toBe("DRIFTED");

    const changedMarketplace = new Harness();
    expect((await canonicalSync(changedMarketplace)).ok).toBe(true);
    changedMarketplace.changeMarketplaceSourceDigest(CODEX_A);
    changedMarketplace.resetCounters();
    expect(await canonicalStatus(changedMarketplace)).toBe("DRIFTED");

    const competingMarketplace = new Harness();
    expect((await canonicalSync(competingMarketplace)).ok).toBe(true);
    competingMarketplace.assignCompetingMarketplaceIdentity(CODEX_A);
    competingMarketplace.resetCounters();
    expect(await canonicalStatus(competingMarketplace)).toBe("BLOCKED_COLLISION");

    const drifted = new Harness();
    expect((await canonicalSync(drifted)).ok).toBe(true);
    drifted.removeLiveMember(CODEX_A, "beta");
    drifted.resetCounters();
    expect(await canonicalStatus(drifted)).toBe("DRIFTED");

    const collision = new Harness();
    collision.seedDesiredCollision(CODEX_A);
    expect(await canonicalStatus(collision)).toBe("BLOCKED_COLLISION");

    const incompatible = new Harness();
    incompatible.missingCapabilitiesHome = CODEX_A.home;
    expect(await canonicalStatus(incompatible)).toBe("INCOMPATIBLE_PROVIDER");

    for (const harness of [
      contentAhead,
      blockedAuthority,
      pending,
      converged,
      absentMarketplace,
      changedMarketplace,
      competingMarketplace,
      drifted,
      collision,
      incompatible,
    ]) {
      expect(harness.counters.nativeMutations).toBe(0);
      expect(harness.counters.receiptWrites).toBe(0);
      expect(harness.counters.identityWrites).toBe(0);
      expect(harness.counters.capsuleBegins).toBe(0);
    }
  });

  it("normalizes stale receipt claims only after live verification and converges read-only on retry", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    harness.addStaleReceiptClaim(CODEX_A, "ghost");
    harness.addUnmanagedMember(CODEX_A, "manual", "manual:plugin");

    harness.resetCounters();
    expect(await canonicalStatus(harness)).toBe("DRIFTED");
    expect(harness.counters.receiptWrites).toBe(0);

    const prior = harness.receiptFor(CODEX_A);
    harness.failReceiptHome = CODEX_A.home;
    harness.resetCounters();
    const failed = await canonicalSync(harness);
    expect(failed.ok && failed.value.status).toBe("Failed");
    expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(prior?.receiptDigest);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta", "manual"]);

    harness.failReceiptHome = null;
    harness.resetCounters();
    const blockedRetry = await canonicalSync(harness);
    expect(blockedRetry.ok && blockedRetry.value.status).toBe("Blocked");
    expect(harness.counters.marketplaceWrites).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);

    harness.restoreMarketplaceFromReceipt(CODEX_A);
    harness.resetCounters();
    const normalized = await canonicalSync(harness);
    expect(normalized.ok && normalized.value.status).toBe("Mutated");
    if (!normalized.ok) return;
    expect(normalized.value.targets[0]?.events.some((event) => event.phase === "applied" && event.action.kind === "NormalizeReceipt")).toBe(true);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(1);
    expect(harness.receiptFor(CODEX_A)?.body.managedMembers.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta", "manual"]);

    harness.resetCounters();
    const repeated = await canonicalSync(harness);
    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it("keeps visibility, cleanup, and receipt failpoints truthful and receipt-final", async () => {
    const visibility = new Harness();
    visibility.failVisibilityHome = CODEX_A.home;
    const visibilityResult = await canonicalSync(visibility);
    expect(visibilityResult.ok && visibilityResult.value.status).toBe("Failed");
    expect(visibility.receiptFor(CODEX_A)).toBeNull();
    expect(visibility.counters.nativeMutations).toBeGreaterThan(0);

    const cleanup = new Harness();
    expect((await canonicalSync(cleanup)).ok).toBe(true);
    cleanup.addStaleReceiptClaim(CODEX_A, "ghost", true);
    const cleanupPrior = cleanup.receiptFor(CODEX_A);
    cleanup.leaveRetiredVisibleHome = CODEX_A.home;
    cleanup.resetCounters();
    const cleanupResult = await canonicalSync(cleanup);
    expect(cleanupResult.ok && cleanupResult.value.status).toBe("Failed");
    expect(cleanup.receiptFor(CODEX_A)?.receiptDigest).toBe(cleanupPrior?.receiptDigest);
    expect(cleanup.memberIds(CODEX_A)).toContain("ghost");
    expect(cleanupResult.ok && cleanupResult.value.targets[0]?.events.some((event) => event.phase === "retired")).toBe(false);

    const receipt = new Harness();
    receipt.failReceiptHome = CODEX_A.home;
    const receiptResult = await canonicalSync(receipt);
    expect(receiptResult.ok && receiptResult.value.status).toBe("Failed");
    expect(receipt.receiptFor(CODEX_A)).toBeNull();
    expect(receipt.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);
    receipt.failReceiptHome = null;
    receipt.resetCounters();
    const receiptRetry = await canonicalSync(receipt);
    expect(receiptRetry.ok && receiptRetry.value.status).toBe("Blocked");
    expect(receipt.counters.nativeMutations).toBe(0);
    expect(receipt.counters.receiptWrites).toBe(0);
    expect(receipt.counters.capsuleBegins).toBe(0);
  });

  it("keeps receipt-owned retirees visible through transition registration before final convergence", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    const prior = harness.receiptFor(CODEX_A);
    if (prior === null) throw new Error("prior canonical receipt fixture missing");
    harness.useAlphaOnlyCanonical();
    harness.resetCounters();

    const converged = await canonicalSync(harness);
    expect(converged.ok && converged.value.status).toBe("Mutated");
    if (!converged.ok) return;
    const actions = converged.value.targets[0]?.events.flatMap((event) =>
      event.phase === "applied" ? [event.action] : []) ?? [];
    expect(actions.map((action) => action.kind)).toEqual([
      "SetMarketplace",
      "RetireMember",
      "SetMarketplace",
      "PublishReceipt",
    ]);
    const marketplaceActions = actions.filter((action): action is Extract<ProviderMutationAction, { kind: "SetMarketplace" }> =>
      action.kind === "SetMarketplace");
    expect(marketplaceActions.map((action) => action.role)).toEqual(["transition", "final"]);
    expect(marketplaceActions[0]?.registration?.members.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);
    expect(marketplaceActions[1]?.registration?.members.map((member) => member.pluginId)).toEqual(["alpha"]);
    const retire = actions.find((action): action is Extract<ProviderMutationAction, { kind: "RetireMember" }> =>
      action.kind === "RetireMember");
    expect(retire?.activeMarketplace?.members.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha"]);
    expect(harness.receiptFor(CODEX_A)?.body.lineage).toEqual({
      kind: "successor",
      priorReceiptDigest: prior.receiptDigest,
    });

    harness.resetCounters();
    const repeated = await canonicalSync(harness);
    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.counters.marketplaceWrites).toBe(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
  });

  it("does not retire before transition registration preserves every receipt-owned member", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    const prior = harness.receiptFor(CODEX_A);
    harness.useAlphaOnlyCanonical();
    harness.marketplaceSideEffect = "drop-beta";
    harness.resetCounters();

    const failed = await canonicalSync(harness);
    expect(failed.ok && failed.value.status).toBe("Failed");
    if (!failed.ok) return;
    const actions = failed.value.targets[0]?.events.flatMap((event) =>
      event.phase === "applied" ? [event.action] : []) ?? [];
    expect(actions.map((action) => action.kind)).toEqual(["SetMarketplace"]);
    expect(actions[0]).toMatchObject({ kind: "SetMarketplace", role: "transition" });
    expect(harness.capsuleApplied.map((action) => action.kind)).toEqual(["SetMarketplace"]);
    expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(prior?.receiptDigest);
  });

  it("records the exact transition and retirement prefix when final registration fails", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    const prior = harness.receiptFor(CODEX_A);
    harness.useAlphaOnlyCanonical();
    harness.failMarketplaceRole = "final";
    harness.resetCounters();

    const failed = await canonicalSync(harness);
    expect(failed.ok && failed.value.status).toBe("Failed");
    if (!failed.ok) return;
    const actions = failed.value.targets[0]?.events.flatMap((event) =>
      event.phase === "applied" ? [event.action] : []) ?? [];
    expect(actions.map((action) => action.kind)).toEqual(["SetMarketplace", "RetireMember"]);
    expect(actions[0]).toMatchObject({ kind: "SetMarketplace", role: "transition" });
    expect(harness.capsuleApplied.map((action) => action.kind)).toEqual(["SetMarketplace", "RetireMember"]);
    expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(prior?.receiptDigest);
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha"]);
    expect(harness.marketplaceFor(CODEX_A)).toMatchObject({
      kind: "present",
      state: { projectionDigest: actions[0]?.kind === "SetMarketplace" ? actions[0].registration?.projectionDigest : undefined },
    });
  });

  it("does not narrow the marketplace or advance the receipt while retired native config residue remains", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    const prior = harness.receiptFor(CODEX_A);
    harness.useAlphaOnlyCanonical();
    harness.leaveRetiredResidueHome = CODEX_A.home;
    harness.resetCounters();

    const failed = await canonicalSync(harness);
    expect(failed.ok && failed.value.status).toBe("Failed");
    if (!failed.ok) return;
    const actions = failed.value.targets[0]?.events.flatMap((event) =>
      event.phase === "applied" ? [event.action] : []) ?? [];
    expect(actions.map((action) => action.kind)).toEqual(["SetMarketplace", "RetireMember"]);
    expect(harness.capsuleApplied.map((action) => action.kind)).toEqual(["SetMarketplace", "RetireMember"]);
    expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(prior?.receiptDigest);
  });

  it("preserves unclaimed native state when no receipt proves retirement ownership", async () => {
    const harness = new Harness();
    harness.addUnclaimedNativeMember(CODEX_A, "ghost");

    const result = await canonicalSync(harness);
    expect(result.ok && result.value.status).toBe("Mutated");
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta", "ghost"]);
    if (!result.ok) return;
    expect(result.value.targets[0]?.events.some((event) =>
      event.phase === "applied"
      && event.action.kind === "RetireMember"
      && event.action.prior.pluginId === "ghost")).toBe(false);
  });

  it("preserves an omitted native member not claimed by the current receipt", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    harness.addUnclaimedNativeMember(CODEX_A, "ghost");

    harness.resetCounters();
    const repeated = await canonicalSync(harness);
    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta", "ghost"]);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it.each(["fingerprint", "source", "duplicate-plugin", "duplicate-native"] as const)(
    "blocks omitted receipt cleanup when the live claim has an altered %s identity",
    async (variant) => {
      const harness = new Harness();
      expect((await canonicalSync(harness)).ok).toBe(true);
      harness.addStaleReceiptClaim(CODEX_A, "ghost", true);
      if (variant === "fingerprint") harness.driftDisabledMember(CODEX_A, "ghost");
      if (variant === "source") harness.assignCompetingProviderSource(CODEX_A, "ghost");
      if (variant === "duplicate-plugin") harness.addUnmanagedMember(CODEX_A, "ghost", "manual:ghost");
      if (variant === "duplicate-native") harness.addUnmanagedMember(CODEX_A, "other-ghost", "rawr:ghost");
      const prior = harness.receiptFor(CODEX_A);

      harness.resetCounters();
      const result = await canonicalSync(harness);
      expect(result.ok && result.value.status).toBe("Blocked");
      expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(prior?.receiptDigest);
      expect(harness.memberIds(CODEX_A)).toContain("ghost");
      expect(harness.counters.nativeMutations).toBe(0);
      expect(harness.counters.receiptWrites).toBe(0);
      expect(harness.counters.capsulePreflights).toBe(0);
      expect(harness.counters.capsuleBegins).toBe(0);
    },
  );

  it("blocks byte-identical desired state observed under another provider source", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    harness.assignCompetingProviderSource(CODEX_A, "alpha");

    harness.resetCounters();
    expect(await canonicalStatus(harness)).toBe("BLOCKED_COLLISION");
    const synced = await canonicalSync(harness);
    expect(synced.ok && synced.value.status).toBe("Blocked");
    const retired = await createManagedRetire(() => harness.retireDependencies())({
      kind: "managed-retire",
      pluginId: "alpha",
      targets: [CODEX_A],
    });
    expect(retired.ok && retired.value.status).toBe("Blocked");
    expect(harness.memberIds(CODEX_A)).toContain("alpha");
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it("blocks explicit retire when standalone state replaces the claimed native identity", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    harness.removeLiveMember(CODEX_A, "alpha");
    harness.addDesiredStandaloneCollision(CODEX_A, "native");
    const prior = harness.receiptFor(CODEX_A);

    harness.resetCounters();
    const result = await createManagedRetire(() => harness.retireDependencies())({
      kind: "managed-retire",
      pluginId: "alpha",
      targets: [CODEX_A],
    });
    expect(result.ok && result.value.status).toBe("Blocked");
    expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(prior?.receiptDigest);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
  });

  it("retires only exact receipt-owned state, retains target identity, and repeats read-only", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    const priorProjectionDigest = harness.receiptFor(CODEX_A)?.body.scope.projectionDigest;
    harness.resetCounters();
    const retiredAlpha = await createManagedRetire(() => harness.retireDependencies())({
      kind: "managed-retire",
      pluginId: "alpha",
      targets: [CODEX_A],
    });
    expect(retiredAlpha.ok && retiredAlpha.value.status).toBe("Mutated");
    const retireAction = retiredAlpha.ok
      ? retiredAlpha.value.targets[0]?.events.flatMap((event) =>
        event.phase === "applied" && event.action.kind === "RetireMember" ? [event.action] : [])[0]
      : undefined;
    expect(retireAction?.kind).toBe("RetireMember");
    if (retireAction?.kind === "RetireMember") {
      expect(retireAction.priorProjectionDigest).toBe(priorProjectionDigest);
    }
    expect(harness.memberIds(CODEX_A)).toEqual(["beta"]);
    expect(harness.receiptFor(CODEX_A)?.body.managedMembers.map((member) => member.pluginId)).toEqual(["beta"]);
    expect(harness.identities.has(CODEX_A.home)).toBe(true);

    harness.resetCounters();
    const repeated = await createManagedRetire(() => harness.retireDependencies())({
      kind: "managed-retire",
      pluginId: "alpha",
      targets: [CODEX_A],
    });
    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.counters.inventoryReads).toBe(1);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);

    harness.resetCounters();
    const retiredBeta = await createManagedRetire(() => harness.retireDependencies())({
      kind: "managed-retire",
      pluginId: "beta",
      targets: [CODEX_A],
    });
    expect(retiredBeta.ok && retiredBeta.value.status).toBe("Mutated");
    expect(harness.memberIds(CODEX_A)).toEqual([]);
    expect(harness.receiptFor(CODEX_A)).toBeNull();
    expect(harness.identities.has(CODEX_A.home)).toBe(true);

    harness.resetCounters();
    const repeatedFinal = await createManagedRetire(() => harness.retireDependencies())({
      kind: "managed-retire",
      pluginId: "beta",
      targets: [CODEX_A],
    });
    expect(repeatedFinal.ok && repeatedFinal.value.status).toBe("ReadOnlyConverged");
    expect(harness.counters.inventoryReads).toBe(1);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.capsuleBegins).toBe(0);
    expect(harness.identities.has(CODEX_A.home)).toBe(true);

    const ambiguous = new Harness();
    expect((await canonicalSync(ambiguous)).ok).toBe(true);
    const beta = ambiguous.native.get(CODEX_A.home)?.find((member) => member.pluginId === "beta");
    if (beta === undefined) throw new Error("beta fixture missing");
    ambiguous.native.set(CODEX_A.home, [{
      ...beta,
      memberFingerprint: `pm1_${"f".repeat(64)}` as NativeMemberObservation["memberFingerprint"],
    }]);
    ambiguous.resetCounters();
    const blocked = await createManagedRetire(() => ambiguous.retireDependencies())({
      kind: "managed-retire",
      pluginId: "beta",
      targets: [CODEX_A],
    });
    expect(blocked.ok && blocked.value.status).toBe("Blocked");
    expect(ambiguous.counters.nativeMutations).toBe(0);
    expect(ambiguous.counters.receiptWrites).toBe(0);
    expect(ambiguous.identities.has(CODEX_A.home)).toBe(true);
  });

  it.each(["absent-receipt", "unclaimed-member"] as const)(
    "observes and blocks unmanaged same-ID state during retire with %s",
    async (variant) => {
      const harness = new Harness();
      expect((await canonicalSync(harness)).ok).toBe(true);
      if (variant === "absent-receipt") {
        harness.receipts.delete(CODEX_A.home);
      } else {
        const retired = await createManagedRetire(() => harness.retireDependencies())({
          kind: "managed-retire",
          pluginId: "alpha",
          targets: [CODEX_A],
        });
        expect(retired.ok && retired.value.status).toBe("Mutated");
        harness.addUnmanagedMember(CODEX_A, "alpha", "manual:alpha");
      }

      harness.resetCounters();
      const result = await createManagedRetire(() => harness.retireDependencies())({
        kind: "managed-retire",
        pluginId: "alpha",
        targets: [CODEX_A],
      });

      expect(result.ok && result.value.status).toBe("Blocked");
      expect(harness.counters.inventoryReads).toBe(1);
      expect(harness.counters.nativeMutations).toBe(0);
      expect(harness.counters.receiptWrites).toBe(0);
      expect(harness.counters.capsulePreflights).toBe(0);
      expect(harness.counters.capsuleBegins).toBe(0);
    },
  );

  it("admits a missing target identity before the first managed native retirement", async () => {
    const harness = new Harness();
    expect((await canonicalSync(harness)).ok).toBe(true);
    harness.identities.delete(CODEX_A.home);
    harness.resetCounters();

    const retired = await createManagedRetire(() => harness.retireDependencies())({
      kind: "managed-retire",
      pluginId: "alpha",
      targets: [CODEX_A],
    });
    expect(retired.ok && retired.value.status).toBe("Mutated");
    if (!retired.ok) return;
    expect(retired.value.targets[0]?.events.flatMap((event) =>
      event.phase === "applied" ? [event.action.kind] : [])).toEqual([
      "AdmitTargetIdentity",
      "RetireMember",
      "SetMarketplace",
      "PublishReceipt",
    ]);
    expect(harness.counters.identityWrites).toBe(1);
    expect(harness.counters.nativeMutations).toBe(1);
    expect(harness.identities.has(CODEX_A.home)).toBe(true);
  });

});

const CODEX_A = Object.freeze({ provider: "codex", home: "/tmp/rawr-c3-home-a" } as const);
const CODEX_B = Object.freeze({ provider: "codex", home: "/tmp/rawr-c3-home-b" } as const);
const CLAUDE_A = Object.freeze({ provider: "claude", home: "/tmp/rawr-c3-claude-home-a" } as const);

class Harness {
  readonly fixture = productFixture();
  readonly alpha = releaseSnapshot(this.fixture.alphaRelease);
  readonly beta = releaseSnapshot(this.fixture.betaRelease);
  readonly alphaRef = this.alpha.ref;
  readonly completeSnapshot: Extract<VerifiedArtifactSnapshotV1, { readonly kind: "complete-set" }> = {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(this.fixture.releaseSet.releaseSetDigest),
    releaseSet: this.fixture.releaseSet,
    members: [this.alpha, this.beta],
  };
  readonly alphaOnlyCompleteSnapshot: Extract<VerifiedArtifactSnapshotV1, { readonly kind: "complete-set" }> = {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(`rs1_${"d".repeat(64)}` as typeof this.fixture.releaseSet.releaseSetDigest),
    releaseSet: this.fixture.releaseSet,
    members: [this.alpha],
  };
  canonicalSnapshot: Extract<VerifiedArtifactSnapshotV1, { readonly kind: "complete-set" }> = this.completeSnapshot;
  canonicalAcceptanceDigest = `lac1_${"a".repeat(64)}` as LifecycleRecordDigest;
  canonicalPromotionDigest = `lpr1_${"b".repeat(64)}` as LifecycleRecordDigest;
  readonly protocol = mustProtocol("codex-native-adapter@v1");
  readonly native = new Map<string, NativeMemberObservation[]>();
  readonly marketplaces = new Map<string, ProviderMarketplaceObservation>();
  readonly standaloneExposures = new Map<string, NativeStandaloneExposureObservation[]>();
  readonly receipts = new Map<string, TargetReceipt>();
  readonly identities = new Map<string, Exclude<TargetIdentityObservation, { kind: "absent" }>["sidecar"]>();
  readonly evidence = new Map<string, { readonly bytes: Uint8Array; readonly handle: MechanicalEvidenceHandle }>();
  lastEvidenceAttempt: Pick<MechanicalProviderEvidence, "bytes" | "evidenceDigest"> | null = null;
  readonly archivedFingerprints = new Set<string>();
  channelKind: CanonicalChannelResolution["kind"] = "current-eligible";
  failInstallHome: string | null = null;
  failVisibilityHome: string | null = null;
  failReceiptHome: string | null = null;
  leaveRetiredVisibleHome: string | null = null;
  leaveRetiredResidueHome: string | null = null;
  missingCapabilitiesHome: string | null = null;
  failCapabilityReadHome: string | null = null;
  failProjectionMaterializationProvider: ProviderTarget["provider"] | null = null;
  failMarketplaceMaterializationProvider: ProviderTarget["provider"] | null = null;
  failInverseProjectionDigest: import("../../../src/service/modules/providers/internal").ProjectionDigest | null = null;
  failEvidencePublish = false;
  syntheticDesiredHook = false;
  marketplaceSideEffect: "drop-beta" | "change-beta" | null = null;
  failMarketplaceRole: Extract<ProviderMutationAction, { kind: "SetMarketplace" }>["role"] | null = null;
  providerMutationAttempts: NativeProviderMutationAction[] = [];
  identityAdmissions: ProviderTarget[] = [];
  capsuleStaged: ProviderMutationAction[] = [];
  capsuleApplied: ProviderMutationAction[] = [];
  counters = freshCounters();

  completeRequest(targets: readonly { readonly provider: ProviderTarget["provider"]; readonly home: string }[]) {
    return this.completeRequestFor(this.completeSnapshot, targets);
  }

  completeRequestFor(
    snapshot: Extract<VerifiedArtifactSnapshotV1, { readonly kind: "complete-set" }>,
    targets: readonly { readonly provider: ProviderTarget["provider"]; readonly home: string }[],
  ) {
    return {
      kind: "complete-test",
      releaseSet: snapshot.ref,
      evaluationProfile: "provider-smoke@v1",
      targets,
    };
  }

  completeDependencies(): CompleteTestDependencies {
    return { ...this.readPorts(), ...this.writePorts() };
  }

  targetedDependencies(): TargetedTestDependencies {
    return { ...this.readPorts(), ...this.writePorts() };
  }

  canonicalDependencies(): CanonicalSyncDependencies {
    return { channel: this.channelPort(), ...this.readPorts(), ...this.writePorts() };
  }

  statusDependencies(): CanonicalStatusDependencies {
    const reads = this.readPorts();
    return { channel: this.channelPort(), releases: reads.releases, provider: reads.provider, receipts: reads.receipts };
  }

  retireDependencies(): ManagedRetireDependencies {
    const reads = this.readPorts();
    const writes = this.writePorts();
    return {
      provider: reads.provider,
      providerMutator: writes.providerMutator,
      receipts: reads.receipts,
      receiptWriter: writes.receiptWriter,
      identities: reads.identities,
      identityWriter: writes.identityWriter,
      undoWriter: writes.undoWriter,
      priorProjections: writes.priorProjections,
      marketplaceMaterializer: writes.marketplaceMaterializer,
    };
  }

  resetCounters(): void {
    this.counters = freshCounters();
    this.providerMutationAttempts = [];
    this.identityAdmissions = [];
    this.capsuleStaged = [];
    this.capsuleApplied = [];
  }

  useAlphaOnlyCanonical(): void {
    this.canonicalSnapshot = this.alphaOnlyCompleteSnapshot;
    this.canonicalAcceptanceDigest = `lac1_${"c".repeat(64)}` as LifecycleRecordDigest;
    this.canonicalPromotionDigest = `lpr1_${"d".repeat(64)}` as LifecycleRecordDigest;
  }

  projectionForTest() {
    return this.projection();
  }

  removeLiveMember(target: { readonly home: string }, pluginId: string): void {
    const members = [...(this.native.get(target.home) ?? [])];
    removeMember(members, pluginId);
    this.native.set(target.home, members);
  }

  driftDisabledMember(target: { readonly home: string }, pluginId: string): void {
    const members = [...(this.native.get(target.home) ?? [])];
    const index = members.findIndex((member) => member.pluginId === pluginId);
    const member = members[index];
    if (member === undefined) throw new Error("native member fixture missing");
    const drifted = Object.freeze({
      ...member,
      memberFingerprint: `pm1_${"f".repeat(64)}` as NativeMemberObservation["memberFingerprint"],
      enablement: "disabled",
    });
    members[index] = drifted;
    this.archivedFingerprints.add(drifted.memberFingerprint);
    this.native.set(target.home, members);
  }

  seedPriorReleaseReceipt(
    target: { readonly home: string },
    priorProjectionDigest = `ap1_${"e".repeat(64)}` as import("../../../src/service/modules/providers/internal").ProjectionDigest,
  ): void {
    const prior = this.receiptFor(target);
    if (prior === null) throw new Error("receipt fixture missing");
    const priorFingerprint = `pm1_${"f".repeat(64)}` as NativeMemberObservation["memberFingerprint"];
    const members = [...(this.native.get(target.home) ?? [])];
    const alphaIndex = members.findIndex((member) => member.pluginId === "alpha");
    const alpha = members[alphaIndex];
    if (alpha === undefined) throw new Error("alpha member fixture missing");
    members[alphaIndex] = Object.freeze({ ...alpha, memberFingerprint: priorFingerprint });
    this.native.set(target.home, members);
    this.archivedFingerprints.add(priorFingerprint);

    const managedMembers = prior.body.managedMembers.map((member) => Object.freeze({
      ...member,
      sourceProjectionDigest: priorProjectionDigest,
      memberFingerprint: member.pluginId === "alpha" ? priorFingerprint : member.memberFingerprint,
    }));
    const registration = createProviderMarketplaceRegistration({
      provider: prior.body.provider,
      adapterProtocol: prior.body.scope.adapterProtocol,
      marketplaceIdentity: prior.body.marketplace.marketplaceIdentity,
      members: managedMembers.map((member) => ({
        pluginId: member.pluginId,
        nativeIdentity: member.nativeIdentity,
        providerSourceIdentity: member.providerSourceIdentity,
        sourceProjectionDigest: member.sourceProjectionDigest,
        memberFingerprint: member.memberFingerprint,
      })),
    });
    const seeded = createTargetReceipt({
      ...prior.body,
      scope: Object.freeze({ ...prior.body.scope, projectionDigest: priorProjectionDigest }),
      marketplace: marketplaceState(registration),
      managedMembers,
    });
    this.receipts.set(target.home, seeded);
    this.marketplaces.set(target.home, Object.freeze({ kind: "present", state: marketplaceState(registration) }));
  }

  dropArchivedSource(target: { readonly home: string }, pluginId: string): void {
    const member = (this.native.get(target.home) ?? []).find((candidate) => candidate.pluginId === pluginId);
    if (member === undefined) throw new Error("native member fixture missing");
    this.archivedFingerprints.delete(member.memberFingerprint);
  }

  addUnmanagedMember(target: { readonly home: string }, pluginId: string, nativeIdentity: string): void {
    const members = [...(this.native.get(target.home) ?? [])];
    const projection = this.projection();
    members.push(observedMember(
      mustTarget(target),
      pluginId,
      nativeIdentity,
      "d",
      projection.artifactAuthority,
      projection.members[0]!.providerSourceIdentity,
    ));
    this.native.set(target.home, members);
  }

  addUnclaimedNativeMember(target: { readonly home: string }, pluginId: string): void {
    const parsedTarget = mustTarget(target);
    const projection = this.projection();
    const members = [...(this.native.get(target.home) ?? [])];
    members.push(observedMember(
      parsedTarget,
      pluginId,
      `rawr:${pluginId}`,
      "e",
      projection.artifactAuthority,
      projection.members[0]!.providerSourceIdentity,
    ));
    this.native.set(target.home, members);
  }

  addUnrelatedStandaloneExposure(target: { readonly home: string }): void {
    const projection = this.projection();
    this.standaloneExposures.set(target.home, [Object.freeze({
      exposureIdentity: "manual:standalone:unrelated",
      nativeIdentity: "manual:unrelated",
      providerSourceIdentity: projection.members[0]!.providerSourceIdentity,
      enablement: "enabled",
      visibleSkills: Object.freeze(["unrelated-skill"]),
      visibleHooks: Object.freeze(["unrelated-hook"]),
    })]);
  }

  addDesiredStandaloneCollision(
    target: { readonly home: string },
    claim: "hook" | "native" | "skill",
  ): void {
    const desired = this.projection().members[0]!;
    this.standaloneExposures.set(target.home, [Object.freeze({
      exposureIdentity: `manual:standalone:${claim}`,
      nativeIdentity: claim === "native" ? desired.nativeIdentity : `manual:${claim}`,
      providerSourceIdentity: "competing-content-authority" as ProviderSourceIdentity,
      enablement: "enabled",
      visibleSkills: Object.freeze(claim === "skill" ? [desired.visible.skills[0]!] : []),
      visibleHooks: Object.freeze(claim === "hook" ? [desired.visible.hooks[0]!] : []),
    })]);
  }

  seedDesiredPluginIdCollision(target: { readonly home: string }): void {
    const desired = this.projection().members[0]!;
    const parsedTarget = mustTarget(target);
    this.native.set(target.home, [observedMember(
      parsedTarget,
      desired.pluginId,
      `manual:${desired.pluginId}`,
      "d",
      desired.artifactAuthority,
      "competing-content-authority" as ProviderSourceIdentity,
    )]);
  }

  assignCompetingProviderSource(target: { readonly home: string }, pluginId: string): void {
    const members = [...(this.native.get(target.home) ?? [])];
    const index = members.findIndex((member) => member.pluginId === pluginId);
    const member = members[index];
    if (member === undefined) throw new Error("native member fixture missing");
    members[index] = Object.freeze({
      ...member,
      providerSourceIdentity: "competing-content-authority" as ProviderSourceIdentity,
    });
    this.native.set(target.home, members);
  }

  seedDesiredCollision(target: { readonly home: string }): void {
    const projection = this.projection();
    const member = projection.members[0]!;
    this.native.set(target.home, [nativeMember(member, "enabled")]);
  }

  addStaleReceiptClaim(target: { readonly home: string }, pluginId: string, includeLive = false): void {
    const prior = this.receiptFor(target);
    if (prior === null) throw new Error("receipt fixture missing");
    const parsedTarget = mustTarget(target);
    const projection = this.projection();
    const claim = observedMember(
      parsedTarget,
      pluginId,
      `rawr:${pluginId}`,
      "e",
      projection.artifactAuthority,
      projection.members[0]!.providerSourceIdentity,
    );
    const managedMembers = [...prior.body.managedMembers, {
      pluginId: claim.pluginId,
      nativeIdentity: claim.nativeIdentity,
      artifactAuthority: claim.artifactAuthority,
      providerSourceIdentity: claim.providerSourceIdentity,
      memberFingerprint: claim.memberFingerprint,
      sourceProjectionDigest: projection.projectionDigest,
    }];
    const registration = createProviderMarketplaceRegistration({
      provider: parsedTarget.provider,
      adapterProtocol: prior.body.scope.adapterProtocol,
      marketplaceIdentity: prior.body.marketplace.marketplaceIdentity,
      members: managedMembers.map((member) => ({
        pluginId: member.pluginId,
        nativeIdentity: member.nativeIdentity,
        providerSourceIdentity: member.providerSourceIdentity,
        sourceProjectionDigest: member.sourceProjectionDigest,
        memberFingerprint: member.memberFingerprint,
      })),
    });
    this.receipts.set(target.home, createTargetReceipt({
      ...prior.body,
      generation: prior.body.generation + 1,
      lineage: { kind: "successor", priorReceiptDigest: prior.receiptDigest },
      marketplace: marketplaceState(registration),
      managedMembers,
    }));
    this.marketplaces.set(target.home, Object.freeze({ kind: "present", state: marketplaceState(registration) }));
    this.archivedFingerprints.add(claim.memberFingerprint);
    if (includeLive) {
      this.native.set(target.home, [...(this.native.get(target.home) ?? []), claim]);
    }
  }

  memberIds(target: { readonly home: string }): readonly string[] {
    return [...(this.native.get(target.home) ?? [])].map((member) => member.pluginId).sort();
  }

  liveStateFor(target: { readonly provider: ProviderTarget["provider"]; readonly home: string }) {
    const parsedTarget = mustTarget(target);
    const marketplace = this.marketplaceFor(target);
    const sidecar = this.identities.get(target.home);
    return Object.freeze({
      inventory: createProviderInventory(
        parsedTarget,
        this.native.get(target.home) ?? [],
        this.standaloneExposures.get(target.home) ?? [],
        marketplace,
      ),
      marketplace,
      identity: sidecar === undefined
        ? Object.freeze({ kind: "absent" as const })
        : Object.freeze({ kind: "present" as const, sidecar }),
    });
  }

  providerMutationAttemptsFor(target: { readonly home: string }): readonly NativeProviderMutationAction[] {
    return this.providerMutationAttempts.filter((action) => action.target.home === target.home);
  }

  identityAdmissionsFor(target: { readonly home: string }): readonly ProviderTarget[] {
    return this.identityAdmissions.filter((candidate) => candidate.home === target.home);
  }

  capsuleStagesFor(target: { readonly home: string }): readonly ProviderMutationAction[] {
    return this.capsuleStaged.filter((action) => action.target.home === target.home);
  }

  capsuleAppliedFor(target: { readonly home: string }): readonly ProviderMutationAction[] {
    return this.capsuleApplied.filter((action) => action.target.home === target.home);
  }

  receiptFor(target: { readonly home: string }): TargetReceipt | null {
    return this.receipts.get(target.home) ?? null;
  }

  marketplaceFor(target: { readonly home: string }): ProviderMarketplaceObservation {
    return this.marketplaces.get(target.home) ?? Object.freeze({ kind: "absent" });
  }

  marketplaceDigestFor(target: { readonly home: string }) {
    const marketplace = this.marketplaceFor(target);
    return marketplace.kind === "present" ? marketplace.state.projectionDigest : undefined;
  }

  setMarketplaceAbsent(target: { readonly home: string }): void {
    this.marketplaces.set(target.home, Object.freeze({ kind: "absent" }));
  }

  changeMarketplaceSourceDigest(target: { readonly home: string }): void {
    const marketplace = this.marketplaceFor(target);
    if (marketplace.kind !== "present") throw new Error("marketplace fixture missing");
    this.marketplaces.set(target.home, Object.freeze({
      kind: "present",
      state: Object.freeze({
        ...marketplace.state,
        sourceDigest: `ps1_${"f".repeat(64)}` as typeof marketplace.state.sourceDigest,
      }),
    }));
  }

  assignCompetingMarketplaceIdentity(target: { readonly home: string }): void {
    const marketplace = this.marketplaceFor(target);
    if (marketplace.kind !== "present") throw new Error("marketplace fixture missing");
    this.marketplaces.set(target.home, Object.freeze({
      kind: "present",
      state: Object.freeze({
        ...marketplace.state,
        marketplaceIdentity: "competing-content-authority" as ProviderSourceIdentity,
      }),
    }));
  }

  restoreMarketplaceFromReceipt(target: { readonly home: string }): void {
    const receipt = this.receiptFor(target);
    if (receipt === null) {
      this.marketplaces.set(target.home, Object.freeze({ kind: "absent" }));
      return;
    }
    const registration = createProviderMarketplaceRegistration({
      provider: receipt.body.provider,
      adapterProtocol: receipt.body.scope.adapterProtocol,
      marketplaceIdentity: receipt.body.marketplace.marketplaceIdentity,
      members: receipt.body.managedMembers.map((member) => ({
        pluginId: member.pluginId,
        nativeIdentity: member.nativeIdentity,
        providerSourceIdentity: member.providerSourceIdentity,
        sourceProjectionDigest: member.sourceProjectionDigest,
        memberFingerprint: member.memberFingerprint,
      })),
    });
    this.marketplaces.set(target.home, Object.freeze({ kind: "present", state: marketplaceState(registration) }));
  }

  evidenceBytes(digest: string): Uint8Array {
    const found = this.evidence.get(digest);
    if (found === undefined) throw new Error("evidence fixture missing");
    return new Uint8Array(found.bytes);
  }

  private readPorts() {
    return {
      releases: {
        read: async (ref: ArtifactRef) => {
          this.counters.artifactReads += 1;
          return success(this.readArtifact(ref));
        },
      },
      provider: {
        projectionAdapterProtocol: (target: ProviderTarget) => success(
          target.provider === "codex" ? this.protocol : mustProtocol("claude-native-adapter@v1"),
        ),
        inspectCapabilities: async (target: ProviderTarget) => {
          this.counters.capabilityReads += 1;
          if (target.home === this.failCapabilityReadHome) {
            return failure([issue("CAPABILITY_MISMATCH", "target.capabilities", "Injected capability read failure")]);
          }
          const available = this.missingCapabilitiesHome === target.home
            ? ALL_CAPABILITIES.filter((entry) => entry !== "managed-retire")
            : ALL_CAPABILITIES;
          return success({
            provider: target.provider,
            adapterProtocol: target.provider === "codex"
              ? this.protocol
              : mustProtocol("claude-native-adapter@v1"),
            available,
          });
        },
        readInventory: async (target: ProviderTarget) => {
          this.counters.inventoryReads += 1;
          return success(createProviderInventory(
            target,
            this.native.get(target.home) ?? [],
            this.standaloneExposures.get(target.home) ?? [],
            this.marketplaces.get(target.home) ?? Object.freeze({ kind: "absent" }),
          ));
        },
        verifyProjection: async (target: ProviderTarget, projection: import("../../../src/service/modules/providers/internal").AgentProviderProjection) => {
          this.counters.visibilityReads += 1;
          if (target.home === this.failVisibilityHome) {
            return failure([issue("VISIBILITY_FAILED", "provider", "Injected visibility failure")]);
          }
          const live = this.native.get(target.home) ?? [];
          const members = projection.members.map((member) => ({
            pluginId: member.pluginId,
            nativeIdentity: member.nativeIdentity,
            artifactAuthority: member.artifactAuthority,
            providerSourceIdentity: member.providerSourceIdentity,
            memberFingerprint: member.memberFingerprint,
          }));
          const matches = projection.members.every((member) => live.some((candidate) =>
            candidate.pluginId === member.pluginId
            && candidate.nativeIdentity === member.nativeIdentity
            && candidate.memberFingerprint === member.memberFingerprint
            && candidate.enablement === "enabled",
          ));
          return matches
            ? success({ visibleFingerprint: visibleFingerprint(members), members })
            : failure([issue("VISIBILITY_FAILED", "provider", "Projection is not provider-visible")]);
        },
      },
      receipts: {
        read: async (target: ProviderTarget) => {
          this.counters.receiptReads += 1;
          const receipt = this.receipts.get(target.home);
          return success<ReceiptObservation>(receipt === undefined ? { kind: "absent" } : { kind: "present", receipt });
        },
      },
      identities: {
        read: async (target: ProviderTarget) => {
          this.counters.identityReads += 1;
          const sidecar = this.identities.get(target.home);
          return success<TargetIdentityObservation>(sidecar === undefined ? { kind: "absent" } : { kind: "present", sidecar });
        },
      },
    };
  }

  private writePorts() {
    return {
      providerMutator: {
        apply: async (action: NativeProviderMutationAction) => {
          this.providerMutationAttempts.push(action);
          if (action.kind === "SetMarketplace") {
            this.counters.marketplaceWrites += 1;
            if (action.role === this.failMarketplaceRole) {
              return failure([issue("MUTATION_FAILED", "provider.marketplace", "Injected marketplace mutation failure")]);
            }
            const observation: ProviderMarketplaceObservation = action.registration === null
              ? Object.freeze({ kind: "absent" })
              : Object.freeze({ kind: "present", state: marketplaceState(action.registration) });
            this.marketplaces.set(action.target.home, observation);
            if (this.marketplaceSideEffect !== null) {
              const members = [...(this.native.get(action.target.home) ?? [])];
              const betaIndex = members.findIndex((member) => member.pluginId === "beta");
              const beta = members[betaIndex];
              if (beta === undefined) throw new Error("beta member fixture missing");
              if (this.marketplaceSideEffect === "drop-beta") {
                members.splice(betaIndex, 1);
              } else {
                members[betaIndex] = Object.freeze({
                  ...beta,
                  memberFingerprint: `pm1_${"f".repeat(64)}` as NativeMemberObservation["memberFingerprint"],
                });
              }
              this.native.set(action.target.home, members);
            }
            return success({ actionKind: action.kind, postMarketplace: observation });
          }
          this.counters.nativeMutations += 1;
          if (action.kind === "InstallMember" && action.target.home === this.failInstallHome) {
            return failure([issue("MUTATION_FAILED", "provider", "Injected install failure")]);
          }
          const members = [...(this.native.get(action.target.home) ?? [])];
          if (action.kind === "InstallMember") members.push(nativeMember(action.member, "enabled"));
          if (action.kind === "EnableMember") replaceMember(members, action.member.pluginId, nativeMember(action.member, "enabled"));
          if (action.kind === "RetireMember" && action.target.home !== this.leaveRetiredVisibleHome) {
            removeMember(members, action.prior.pluginId);
            if (action.target.home === this.leaveRetiredResidueHome) {
              this.standaloneExposures.set(action.target.home, [Object.freeze({
                exposureIdentity: `${action.prior.pluginId}@${action.prior.providerSourceIdentity}`,
                nativeIdentity: action.prior.nativeIdentity,
                providerSourceIdentity: action.prior.providerSourceIdentity,
                enablement: "enabled",
                visibleSkills: Object.freeze([]),
                visibleHooks: Object.freeze([]),
              })]);
            }
          }
          this.native.set(action.target.home, members);
          const nativeIdentity = action.kind === "RetireMember"
            ? action.prior.nativeIdentity
            : action.member.nativeIdentity;
          const postMember = members.find((member) => member.nativeIdentity === nativeIdentity) ?? null;
          return success({ actionKind: action.kind, postMember });
        },
      },
      receiptWriter: {
        publish: async (target: ProviderTarget, _prior: ReceiptObservation, receipt: TargetReceipt) => {
          this.counters.receiptWrites += 1;
          if (target.home === this.failReceiptHome) {
            return failure([issue("RECEIPT_FAILED", "receipt", "Injected receipt publication failure")]);
          }
          this.receipts.set(target.home, receipt);
          return success(receipt);
        },
        remove: async (target: ProviderTarget) => {
          this.counters.receiptWrites += 1;
          this.receipts.delete(target.home);
          return success(null);
        },
      },
      identityWriter: {
        admit: async (target: ProviderTarget, sidecar: Exclude<TargetIdentityObservation, { kind: "absent" }>["sidecar"]) => {
          this.counters.identityWrites += 1;
          this.identityAdmissions.push(target);
          this.identities.set(target.home, sidecar);
          return success(sidecar);
        },
      },
      undoWriter: {
        preflight: async () => {
          this.counters.capsulePreflights += 1;
          return success(null);
        },
        begin: async () => {
          this.counters.capsuleBegins += 1;
          return success({
            stage: async (action: ProviderMutationAction) => {
              this.capsuleStaged.push(action);
              return success(null);
            },
            applied: async (observation: { readonly action: ProviderMutationAction }) => {
              this.capsuleApplied.push(observation.action);
              return success(null);
            },
            fail: async () => success(null),
            settle: async () => success(null),
          });
        },
      },
      evidence: {
        inspect: async (digest: import("../../../src/service/modules/providers/internal").MechanicalEvidenceDigest) => {
          this.counters.evidenceReads += 1;
          const found = this.evidence.get(digest);
          return success<MechanicalEvidenceObservation>(found === undefined
            ? { kind: "missing" }
            : { kind: "present", handle: found.handle, bytes: new Uint8Array(found.bytes) });
        },
        publish: async (value: import("../../../src/service/modules/providers/internal").MechanicalProviderEvidence) => {
          this.counters.evidencePublishes += 1;
          this.lastEvidenceAttempt = Object.freeze({
            evidenceDigest: value.evidenceDigest,
            bytes: new Uint8Array(value.bytes),
          });
          if (this.failEvidencePublish) {
            return failure([issue("EVIDENCE_FAILED", "evidence", "Injected evidence publication failure")]);
          }
          const handle = { evidenceDigest: value.evidenceDigest, artifactIdentity: `evidence/${value.evidenceDigest}` };
          this.evidence.set(value.evidenceDigest, { bytes: new Uint8Array(value.bytes), handle });
          return success(handle);
        },
      },
      projectionMaterializer: {
        materialize: async (projection: import("../../../src/service/modules/providers/internal").AgentProviderProjection) => {
          this.counters.projectionMaterializations += 1;
          if (projection.provider === this.failProjectionMaterializationProvider) {
            return failure([issue("PROJECTION_MISMATCH", "projection.materialization", "Injected provider projection materialization failure")]);
          }
          for (const member of projection.members) this.archivedFingerprints.add(member.memberFingerprint);
          return success({ kind: "published" as const, projectionDigest: projection.projectionDigest });
        },
      },
      marketplaceMaterializer: {
        materialize: async (
          _provider: ProviderTarget["provider"],
          registration: ProviderMarketplaceRegistration,
        ) => {
          this.counters.marketplaceMaterializations += 1;
          if (_provider === this.failMarketplaceMaterializationProvider) {
            return failure([issue("PROJECTION_MISMATCH", "marketplace.materialization", "Injected provider marketplace materialization failure")]);
          }
          if (registration.members.some((member) => !this.archivedFingerprints.has(member.memberFingerprint))) {
            return failure([issue("PROJECTION_MISMATCH", "marketplace.materialization", "marketplace member archive missing")]);
          }
          return success({
            kind: "published" as const,
            projectionDigest: registration.projectionDigest,
            sourceDigest: registration.sourceDigest,
          });
        },
      },
      priorProjections: {
        readArchivedMember: async (
          projectionDigest: import("../../../src/service/modules/providers/internal").ProjectionDigest,
          prior: NativeMemberObservation,
        ) => {
          this.counters.inverseSourceReads += 1;
          if (projectionDigest === this.failInverseProjectionDigest) {
            return failure([issue("PROJECTION_MISMATCH", "projection.archive", "Injected target inverse source failure")]);
          }
          return this.archivedFingerprints.has(prior.memberFingerprint)
            ? success({ projectionDigest, memberFingerprint: prior.memberFingerprint })
            : failure([issue("PROJECTION_MISMATCH", "projection.archive", "prior projection source missing")]);
        },
      },
    };
  }

  private channelPort() {
    return {
      resolve: async () => {
        this.counters.channelReads += 1;
        return success(this.channelResolution());
      },
    };
  }

  private channelResolution(): CanonicalChannelResolution {
    if (this.channelKind === "content-ahead-of-acceptance" || this.channelKind === "blocked-acceptance-authority") {
      return Object.freeze({ kind: this.channelKind });
    }
    const projection = this.projection();
    return Object.freeze({
      kind: this.channelKind,
      releaseSet: this.canonicalSnapshot.ref,
      acceptanceDigest: this.canonicalAcceptanceDigest,
      promotionDigest: this.canonicalPromotionDigest,
      projections: Object.freeze([Object.freeze({
        provider: "codex" as const,
        rendererProtocol: projection.rendererProtocol,
        adapterProtocol: projection.adapterProtocol,
        capabilityProfileDigest: projection.capabilityProfile.capabilityProfileDigest,
        projectionDigest: projection.projectionDigest,
      })]),
    });
  }

  private projection() {
    const result = renderCompleteProjection("codex", this.protocol, this.canonicalSnapshot);
    if (!result.ok) throw new Error(result.issues[0].message);
    if (!this.syntheticDesiredHook) return result.value;
    const first = result.value.members[0];
    if (first === undefined) throw new Error("projection fixture member missing");
    return Object.freeze({
      ...result.value,
      members: Object.freeze([
        Object.freeze({
          ...first,
          visible: Object.freeze({ ...first.visible, hooks: Object.freeze(["session-start"]) }),
        }),
        ...result.value.members.slice(1),
      ]),
    });
  }

  private readArtifact(ref: ArtifactRef): VerifiedArtifactSnapshotV1 {
    if (ref.kind === "complete-set") {
      return ref.releaseSetDigest === this.alphaOnlyCompleteSnapshot.ref.releaseSetDigest
        ? this.alphaOnlyCompleteSnapshot
        : this.completeSnapshot;
    }
    if (ref.releaseDigest === this.alpha.ref.releaseDigest) return this.alpha;
    if (ref.releaseDigest === this.beta.ref.releaseDigest) return this.beta;
    throw new Error("unknown artifact fixture");
  }
}

function releaseSnapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return {
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  };
}

function mustProtocol(value: string) {
  const parsed = parseAdapterProtocol(value);
  if (!parsed.ok) throw new Error("fixture protocol must parse");
  return parsed.value;
}

function nativeMember(
  member: import("../../../src/service/modules/providers/internal").ProviderProjectionMember,
  enablement: "disabled" | "enabled",
): NativeMemberObservation {
  return {
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    enablement,
    visibleSkills: member.visible.skills,
    visibleHooks: member.visible.hooks,
  };
}

function observedMember(
  target: ProviderTarget,
  pluginId: string,
  nativeIdentity: string,
  fill: string,
  artifactAuthority: ProviderArtifactAuthority,
  providerSourceIdentity: ProviderSourceIdentity,
): NativeMemberObservation {
  return {
    pluginId,
    nativeIdentity,
    artifactAuthority,
    providerSourceIdentity,
    memberFingerprint: `pm1_${fill.repeat(64)}`,
    enablement: "enabled",
    visibleSkills: [],
    visibleHooks: [],
  } as unknown as NativeMemberObservation;
}

function mustTarget(target: { readonly home: string; readonly provider?: "codex" | "claude" }): ProviderTarget {
  const parsed = parseProviderTarget({ provider: target.provider ?? "codex", home: target.home });
  if (!parsed.ok) throw new Error(parsed.issues[0].message);
  return parsed.value;
}

async function canonicalSync(harness: Harness) {
  return await createCanonicalSync(() => harness.canonicalDependencies())({
    kind: "canonical-sync",
    channel: "current-main",
    locator: LOCATOR,
    targets: [CODEX_A],
  });
}

async function canonicalStatus(harness: Harness) {
  return (await canonicalStatusOutcome(harness)).status;
}

async function canonicalStatusOutcome(harness: Harness) {
  const result = await createCanonicalStatus(() => harness.statusDependencies())({
    kind: "canonical-status",
    channel: "current-main",
    locator: LOCATOR,
    targets: [CODEX_A],
  });
  if (!result.ok) throw new Error(result.issues[0].message);
  const outcome = result.value[0];
  if (outcome === undefined) throw new Error("canonical status fixture returned no target");
  return outcome;
}

function replaceMember(members: NativeMemberObservation[], pluginId: string, next: NativeMemberObservation): void {
  removeMember(members, pluginId);
  members.push(next);
}

function removeMember(members: NativeMemberObservation[], pluginId: string): void {
  const index = members.findIndex((member) => member.pluginId === pluginId);
  if (index >= 0) members.splice(index, 1);
}

function freshCounters() {
  return {
    channelReads: 0,
    artifactReads: 0,
    capabilityReads: 0,
    inventoryReads: 0,
    visibilityReads: 0,
    receiptReads: 0,
    identityReads: 0,
    evidenceReads: 0,
    nativeMutations: 0,
    receiptWrites: 0,
    identityWrites: 0,
    capsulePreflights: 0,
    capsuleBegins: 0,
    evidencePublishes: 0,
    projectionMaterializations: 0,
    marketplaceMaterializations: 0,
    marketplaceWrites: 0,
    inverseSourceReads: 0,
  };
}

const ALL_CAPABILITIES = Object.freeze([
  "managed-retire",
  "native-plugin-enable",
  "native-plugin-install",
  "visible-plugin-inventory",
  "visible-skill-inventory",
  "visible-hook-inventory",
] satisfies readonly ProviderCapability[]);

const LOCATOR = Object.freeze({
  repositoryIdentity: "git:github.com/example/personal-rawr-hq",
  workspaceRoot: "/tmp/personal-rawr-hq",
});
