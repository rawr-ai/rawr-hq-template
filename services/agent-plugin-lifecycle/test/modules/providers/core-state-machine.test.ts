import {
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseInput,
  createAgentPluginReleaseSet,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type ArtifactRef,
  type ContentAuthority,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import { describe, expect, it } from "vitest";

import { must, productFixture, releaseInputBody, SOURCE } from "../../shared/release/fixtures";
import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "../../../src/service/modules/providers/model/policy/marketplace";
import {
  parseAdapterProtocol,
  renderCompleteProjection,
  type AgentProviderProjection,
  type ProjectionDigest,
  type ProviderArtifactAuthority,
  type ProviderCapability,
  type ProviderProjectionMember,
  type ProviderSourceIdentity,
} from "../../../src/service/modules/providers/model/policy/projection";
import {
  createProviderInventory,
  hasProjectionExposureCollision,
  type NativeMemberObservation,
  type NativeStandaloneExposureObservation,
  type ProviderMutationAction,
  type ReceiptObservation,
  type TargetIdentityObservation,
} from "../../../src/service/modules/providers/model/policy/state-machine";
import {
  createTargetReceipt,
  visibleFingerprint,
  type TargetReceipt,
} from "../../../src/service/modules/providers/model/policy/receipt";
import {
  mechanicalTargetFactDigest,
  type MechanicalEvidenceDigest,
  type MechanicalProviderEvidence,
} from "../../../src/service/modules/providers/model/dto/mechanical-evidence";
import {
  type CompleteTestInput,
  type TargetedTestInput,
} from "../../../src/service/modules/providers/model/dto/mode";
import {
  parseProviderTarget,
  type ProviderTarget,
} from "../../../src/service/modules/providers/model/dto/provider-target";
import type { UnboundTargetOperationOutcome } from "../../../src/service/modules/providers/model/dto/outcome";
import { decodeMechanicalProviderEvidence } from "../../../src/service/modules/providers/model/helpers/evidence-codec";
import type {
  MechanicalEvidenceHandle,
  MechanicalEvidenceObservation,
} from "../../../src/service/modules/providers/model/repositories/evidence";
import type { NativeProviderMutationAction } from "../../../src/service/modules/providers/model/repositories/provider";
import {
  failure,
  issue,
  success,
} from "../../../src/service/modules/providers/model/errors/deployment-result";
import {
  bindCompleteProjectionOutcomes,
  executeCompleteTest,
  type CompleteTestDependencies,
} from "../../../src/service/modules/providers/router/complete-test.router";
import {
  executeTargetedTest,
  type TargetedTestDependencies,
} from "../../../src/service/modules/providers/router/targeted-test.router";

function createCompleteTest(dependencies: () => CompleteTestDependencies) {
  return async (input: CompleteTestInput) => executeCompleteTest(input, dependencies());
}

function createTargetedTest(dependencies: () => TargetedTestDependencies) {
  return async (input: TargetedTestInput) => executeTargetedTest(input, dependencies());
}

describe("provider deployment state machine", () => {
  it("reads live truth on repeat while every mutation, receipt, sidecar, and evidence write stays at zero", async () => {
    const harness = new Harness();
    const app = createCompleteTest(() => harness.completeDependencies());
    const first = await app(harness.completeRequest([CODEX_A]));
    expect(first.ok && first.value.status).toBe("Mutated");
    if (!first.ok) return;
    const firstBinding = first.value.targets[0]?.projectionBinding;
    const firstReceipt = harness.receiptFor(CODEX_A);
    if (firstReceipt === null) throw new Error("target receipt fixture missing");
    expect(firstBinding).toEqual({
      provider: "codex",
      projectionDigest: firstReceipt.body.scope.projectionDigest,
      rendererProtocol: "rawr-provider-renderer/codex@v1",
      adapterProtocol: firstReceipt.body.scope.adapterProtocol,
      capabilityProfileDigest: firstReceipt.body.scope.capabilityProfileDigest,
    });
    expect(harness.receiptFor(CODEX_A)).not.toBeNull();
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);
    expect(harness.counters.projectionMaterializations).toBe(1);
    expect(harness.counters.marketplaceMaterializations).toBe(1);
    expect(harness.counters.marketplaceWrites).toBe(1);

    harness.resetCounters();
    const second = await app(harness.completeRequest([CODEX_A]));
    expect(second.ok && second.value.status).toBe("ReadOnlyConverged");
    if (!second.ok) return;
    expect(second.value.targets[0]?.projectionBinding).toEqual(firstBinding);
    expect(harness.counters.capabilityReads).toBeGreaterThan(0);
    expect(harness.counters.inventoryReads).toBeGreaterThan(0);
    expect(harness.counters.visibilityReads).toBeGreaterThan(0);
    expect(harness.counters.receiptReads).toBeGreaterThan(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.identityWrites).toBe(0);
    expect(harness.counters.evidencePublishes).toBe(0);
    expect(harness.counters.projectionMaterializations).toBe(0);
    expect(harness.counters.marketplaceMaterializations).toBe(0);
    expect(harness.counters.marketplaceWrites).toBe(0);
  });

  it("mutates then read-only converges two members with the same plugin-scoped hook event", async () => {
    const harness = new Harness();
    harness.useCompleteSnapshot(sharedHookCompleteSnapshot());
    const app = createCompleteTest(() => harness.completeDependencies());

    const first = await app(harness.completeRequest([CODEX_A]));

    expect(first.ok && first.value.status).toBe("Mutated");
    expect(
      harness.liveStateFor(CODEX_A).inventory.members.map((member) => ({
        pluginId: member.pluginId,
        visibleHooks: member.visibleHooks,
      }))
    ).toEqual([
      { pluginId: "alpha", visibleHooks: ["stop"] },
      { pluginId: "beta", visibleHooks: ["stop"] },
    ]);

    harness.resetCounters();
    const repeated = await app(harness.completeRequest([CODEX_A]));

    expect(repeated.ok && repeated.value.status).toBe("ReadOnlyConverged");
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.marketplaceWrites).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.identityWrites).toBe(0);
    expect(harness.counters.evidencePublishes).toBe(0);
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
  });

  it("preserves omitted managed members in targeted tests", async () => {
    const harness = new Harness();
    const complete = await createCompleteTest(() => harness.completeDependencies())(
      harness.completeRequest([CODEX_A])
    );
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
    const targeted = await createTargetedTest(() => harness.targetedDependencies())(
      targetedRequest
    );
    expect(targeted.ok).toBe(true);
    if (!targeted.ok) return;
    expect(targeted.value.targets[0]?.projectionBinding).toBeNull();
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.marketplaceWrites).toBe(1);
    expect(harness.counters.receiptWrites).toBe(1);
    expect(
      harness.receiptFor(CODEX_A)?.body.managedMembers.map((member) => member.pluginId)
    ).toEqual(["alpha", "beta"]);
    const claims = harness.receiptFor(CODEX_A)?.body.managedMembers;
    expect(claims?.find((claim) => claim.pluginId === "alpha")?.sourceProjectionDigest).not.toBe(
      completeProjectionDigest
    );
    expect(claims?.find((claim) => claim.pluginId === "beta")?.sourceProjectionDigest).toBe(
      completeProjectionDigest
    );
    const registrationAction = targeted.ok
      ? targeted.value.targets[0]?.events.flatMap((event) =>
          event.phase === "applied" && event.action.kind === "SetMarketplace" ? [event.action] : []
        )[0]
      : undefined;
    expect(registrationAction?.kind).toBe("SetMarketplace");
    if (registrationAction?.kind === "SetMarketplace") {
      expect(registrationAction.expected).toMatchObject({
        kind: "present",
        state: { projectionDigest: completeMarketplaceDigest },
      });
      expect(registrationAction.registration?.members.map((member) => member.pluginId)).toEqual([
        "alpha",
        "beta",
      ]);
      expect(
        registrationAction.registration?.members.find((member) => member.pluginId === "alpha")
          ?.sourceProjectionDigest
      ).not.toBe(completeProjectionDigest);
      expect(
        registrationAction.registration?.members.find((member) => member.pluginId === "beta")
          ?.sourceProjectionDigest
      ).toBe(completeProjectionDigest);
    }
    expect(harness.marketplaceDigestFor(CODEX_A)).toBe(
      harness.receiptFor(CODEX_A)?.body.marketplace.projectionDigest
    );

    harness.resetCounters();
    const repeatedTargeted = await createTargetedTest(() => harness.targetedDependencies())(
      targetedRequest
    );
    expect(repeatedTargeted.ok && repeatedTargeted.value.status).toBe("ReadOnlyConverged");
    expect(harness.counters.marketplaceWrites).toBe(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
  });

  it.each([
    "drop-beta",
    "change-beta",
  ] as const)("refuses targeted convergence when marketplace mutation side effects %s", async (sideEffect) => {
    const harness = new Harness();
    expect(
      (
        await createCompleteTest(() => harness.completeDependencies())(
          harness.completeRequest([CODEX_A])
        )
      ).ok
    ).toBe(true);
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
  });

  it("blocks effective marketplace materialization before provider mutation when a preserved member archive is missing", async () => {
    const harness = new Harness();
    expect(
      (
        await createCompleteTest(() => harness.completeDependencies())(
          harness.completeRequest([CODEX_A])
        )
      ).ok
    ).toBe(true);
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
    expect(harness.counters.marketplaceWrites).toBe(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.receiptFor(CODEX_A)?.receiptDigest).toBe(priorReceipt);
    expect(harness.marketplaceDigestFor(CODEX_A)).toBe(priorMarketplace);
  });

  it.each([
    "projection",
    "marketplace",
  ] as const)("isolates one provider %s materialization failure from an eligible target", async (failureKind) => {
    const harness = new Harness();
    const failedTargetBefore = harness.liveStateFor(CODEX_A);
    if (failureKind === "projection") harness.failProjectionMaterializationProvider = "codex";
    else harness.failMarketplaceMaterializationProvider = "codex";

    const result = await createCompleteTest(() => harness.completeDependencies())(
      harness.completeRequest([CODEX_A, CLAUDE_A])
    );

    expect(result.ok && result.value.status).toBe("PartialFailure");
    if (!result.ok) return;
    const failed = result.value.targets.find((target) => target.target.provider === "codex");
    const successful = result.value.targets.find((target) => target.target.provider === "claude");
    expect(failed?.status).toBe("failed");
    expect(failed?.projectionBinding).toBeNull();
    expect(successful?.status).toBe("mutated");
    expect(successful?.projectionBinding).toMatchObject({
      provider: "claude",
      rendererProtocol: "rawr-provider-renderer/claude@v1",
      adapterProtocol: "claude-native-adapter@v1",
    });
    expect(harness.liveStateFor(CODEX_A)).toEqual(failedTargetBefore);
    expect(harness.memberIds(CLAUDE_A)).toEqual(["alpha", "beta"]);
    expect(harness.receiptFor(CODEX_A)).toBeNull();
    expect(harness.receiptFor(CLAUDE_A)).not.toBeNull();
    expect(harness.providerMutationAttemptsFor(CODEX_A)).toEqual([]);
    expect(harness.identityAdmissionsFor(CODEX_A)).toEqual([]);
  });

  it("fails internally when a successful complete-test outcome has no matching plan projection", async () => {
    const harness = new Harness();
    const result = await createCompleteTest(() => harness.completeDependencies())(
      harness.completeRequest([CODEX_A])
    );
    if (!result.ok) throw new Error(result.issues[0].message);
    const successful = result.value.targets[0];
    if (
      successful === undefined ||
      successful.status === "blocked" ||
      successful.status === "failed"
    ) {
      throw new Error("successful target fixture missing");
    }
    const unbound: UnboundTargetOperationOutcome = Object.freeze({
      ...successful,
      projectionBinding: null,
    });

    const rebound = bindCompleteProjectionOutcomes([], [unbound]);
    expect(rebound[0]).toMatchObject({
      status: "failed",
      projectionBinding: null,
      issues: [
        {
          code: "PROJECTION_MISMATCH",
          path: "targets[0].projectionBinding",
        },
      ],
    });
    expect(rebound[0]?.events).toEqual([
      ...unbound.events,
      expect.objectContaining({
        phase: "failed",
        issues: [expect.objectContaining({ code: "PROJECTION_MISMATCH" })],
      }),
    ]);
  });

  it("refreshes a selected stale member while preserving an omitted prior claim in complete-test mode", async () => {
    const harness = new Harness();
    const app = createCompleteTest(() => harness.completeDependencies());
    const request = harness.completeRequestFor(harness.alphaOnlyCompleteSnapshot, [CODEX_A]);
    expect((await app(request)).ok).toBe(true);
    harness.addStaleReceiptClaim(CODEX_A, "beta", true);
    harness.seedPriorReleaseReceipt(CODEX_A);
    const betaBefore = harness
      .liveStateFor(CODEX_A)
      .inventory.members.find((member) => member.pluginId === "beta");
    if (betaBefore === undefined) throw new Error("omitted beta fixture missing");

    harness.resetCounters();
    const repeated = await app(request);
    expect(repeated.ok && repeated.value.status).toBe("Mutated");
    if (!repeated.ok) return;
    expect(repeated.value.targets[0]?.projectionBinding).toMatchObject({
      provider: "codex",
      rendererProtocol: "rawr-provider-renderer/codex@v1",
      adapterProtocol: harness.protocol,
    });
    expect(harness.memberIds(CODEX_A)).toEqual(["alpha", "beta"]);
    expect(
      harness.liveStateFor(CODEX_A).inventory.members.find((member) => member.pluginId === "beta")
    ).toEqual(betaBefore);
    expect(
      harness.receiptFor(CODEX_A)?.body.managedMembers.map((member) => member.pluginId)
    ).toEqual(["alpha", "beta"]);
    expect(harness.receiptFor(CODEX_A)?.body.scope.kind).toBe("complete-test");
    expect(
      harness
        .providerMutationAttemptsFor(CODEX_A)
        .filter((action) => "member" in action && action.member.pluginId === "beta")
    ).toEqual([]);
    expect(harness.counters.nativeMutations).toBeGreaterThan(0);

    const testedBinding = repeated.value.targets[0]?.projectionBinding;
    harness.resetCounters();
    const converged = await app(request);
    expect(converged.ok && converged.value.status).toBe("ReadOnlyConverged");
    if (!converged.ok) return;
    expect(converged.value.targets[0]?.projectionBinding).toEqual(testedBinding);
    expect(
      harness.liveStateFor(CODEX_A).inventory.members.find((member) => member.pluginId === "beta")
    ).toEqual(betaBefore);
    expect(harness.counters.capabilityReads).toBeGreaterThan(0);
    expect(harness.counters.inventoryReads).toBeGreaterThan(0);
    expect(harness.counters.visibilityReads).toBeGreaterThan(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
    expect(harness.counters.identityWrites).toBe(0);
    expect(harness.counters.evidencePublishes).toBe(0);
    expect(harness.counters.projectionMaterializations).toBe(0);
    expect(harness.counters.marketplaceMaterializations).toBe(0);
    expect(harness.counters.marketplaceWrites).toBe(0);
  });

  it("does not treat an unrelated standalone same-event hook as a global collision", () => {
    const harness = new Harness();
    harness.syntheticDesiredHook = true;
    harness.addDesiredStandaloneCollision(CODEX_A, "hook");
    const target = mustTarget(CODEX_A);
    const inventory = createProviderInventory(
      target,
      [],
      harness.standaloneExposures.get(CODEX_A.home) ?? []
    );

    expect(hasProjectionExposureCollision(inventory, harness.projectionForTest())).toBe(false);
    expect(harness.counters.inventoryReads).toBe(0);
    expect(harness.counters.nativeMutations).toBe(0);
    expect(harness.counters.receiptWrites).toBe(0);
  });

  it("does not cross-collide exact members that expose the same plugin-scoped hook event", () => {
    const harness = new Harness();
    harness.syntheticDesiredHook = true;
    const projection = harness.projectionForTest();
    const target = mustTarget(CODEX_A);
    const inventory = createProviderInventory(
      target,
      projection.members.map((member) => nativeMember(member, "enabled")),
      []
    );

    expect(projection.members.map((member) => member.visible.hooks)).toEqual([
      ["session-start"],
      ["session-start"],
    ]);
    expect(hasProjectionExposureCollision(inventory, projection)).toBe(false);
  });

  it.each([
    "native",
    "skill",
  ] as const)("preserves exact standalone %s collision detection", (claim) => {
    const harness = new Harness();
    harness.addDesiredStandaloneCollision(CODEX_A, claim);
    const target = mustTarget(CODEX_A);
    const inventory = createProviderInventory(
      target,
      [],
      harness.standaloneExposures.get(CODEX_A.home) ?? []
    );

    expect(hasProjectionExposureCollision(inventory, harness.projectionForTest())).toBe(true);
  });

  it("keeps home A truthful when home B fails after all plans are read", async () => {
    const harness = new Harness();
    harness.failInstallHome = CODEX_B.home;
    const result = await createCompleteTest(() => harness.completeDependencies())(
      harness.completeRequest([CODEX_B, CODEX_A])
    );
    expect(result.ok && result.value.status).toBe("PartialFailure");
    if (!result.ok) return;
    const byHome = new Map<string, (typeof result.value.targets)[number]>(
      result.value.targets.map((target) => [target.target.home, target])
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
      harness.completeRequest([CODEX_A, CODEX_B])
    );
    expect(result.ok && result.value.status).toBe("PartialFailure");
    if (!result.ok || result.value.evidence === null) return;

    const decoded = decodeMechanicalProviderEvidence(
      harness.evidenceBytes(result.value.evidence),
      result.value.evidence
    );
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.body.targets).toHaveLength(2);
    const failedTarget = decoded.value.body.targets.find(
      (fact) => fact.targetDigest === mustTarget(CODEX_B).targetDigest
    );
    expect(failedTarget).toMatchObject({
      kind: "failed",
      failureCodes: ["CAPABILITY_MISMATCH"],
    });
  });

  it("publishes the digest preimage and verifies full target facts without transaction history", async () => {
    const harness = new Harness();
    const result = await createCompleteTest(() => harness.completeDependencies())(
      harness.completeRequest([CODEX_A])
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.evidence === null) return;
    const bytes = harness.evidenceBytes(result.value.evidence);
    const decoded = decodeMechanicalProviderEvidence(bytes, result.value.evidence);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.body.targets).toHaveLength(1);
    expect(mechanicalTargetFactDigest(decoded.value.body.targets[0]!)).toMatch(
      /^mtf1_[0-9a-f]{64}$/u
    );
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
    expect(harness.counters.evidencePublishes).toBe(1);
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
  readonly completeSnapshot: Extract<
    VerifiedArtifactSnapshotV1,
    { readonly kind: "complete-set" }
  > = {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(this.fixture.releaseSet.releaseSetDigest),
    releaseSet: this.fixture.releaseSet,
    members: [this.alpha, this.beta],
  };
  readonly alphaOnlyReleaseInput = must(
    createAgentPluginReleaseInput({
      ...this.fixture.releaseInput.body,
      members: this.fixture.releaseInput.body.members.filter(
        (member) => member.pluginId === "alpha"
      ),
      ownershipClaims: this.fixture.releaseInput.body.ownershipClaims.filter(
        (claim) => claim.ownerPluginId === "alpha"
      ),
    })
  );
  readonly alphaOnlyRelease = must(
    createAgentPluginRelease({
      releaseInput: this.alphaOnlyReleaseInput,
      pluginId: "alpha",
      source: SOURCE,
      payload: this.fixture.alphaPayload,
    })
  );
  readonly alphaOnlyReleaseSet = must(
    createAgentPluginReleaseSet({
      releaseInput: this.alphaOnlyReleaseInput,
      releases: [this.alphaOnlyRelease],
    })
  );
  readonly alphaOnlyCompleteSnapshot: Extract<
    VerifiedArtifactSnapshotV1,
    { readonly kind: "complete-set" }
  > = {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(this.alphaOnlyReleaseSet.releaseSetDigest),
    releaseSet: this.alphaOnlyReleaseSet,
    members: [releaseSnapshot(this.alphaOnlyRelease)],
  };
  readonly protocol = mustProtocol("codex-native-adapter@v1");
  private activeCompleteSnapshot = this.completeSnapshot;
  readonly native = new Map<string, NativeMemberObservation[]>();
  readonly marketplaces = new Map<string, ProviderMarketplaceObservation>();
  readonly standaloneExposures = new Map<string, NativeStandaloneExposureObservation[]>();
  readonly receipts = new Map<string, TargetReceipt>();
  readonly identities = new Map<
    string,
    Exclude<TargetIdentityObservation, { kind: "absent" }>["sidecar"]
  >();
  readonly evidence = new Map<
    string,
    { readonly bytes: Uint8Array; readonly handle: MechanicalEvidenceHandle }
  >();
  readonly inventoryInspectionAuthorities: Array<ContentAuthority | undefined> = [];
  lastEvidenceAttempt: Pick<MechanicalProviderEvidence, "bytes" | "evidenceDigest"> | null = null;
  readonly archivedFingerprints = new Set<string>();
  failInstallHome: string | null = null;
  failVisibilityHome: string | null = null;
  failReceiptHome: string | null = null;
  leaveRetiredVisibleHome: string | null = null;
  leaveRetiredResidueHome: string | null = null;
  missingCapabilitiesHome: string | null = null;
  failCapabilityReadHome: string | null = null;
  failProjectionMaterializationProvider: ProviderTarget["provider"] | null = null;
  failMarketplaceMaterializationProvider: ProviderTarget["provider"] | null = null;
  failEvidencePublish = false;
  syntheticDesiredHook = false;
  marketplaceSideEffect: "drop-beta" | "change-beta" | null = null;
  failMarketplaceRole: Extract<ProviderMutationAction, { kind: "SetMarketplace" }>["role"] | null =
    null;
  uncertainMarketplaceRole:
    | Extract<ProviderMutationAction, { kind: "SetMarketplace" }>["role"]
    | null = null;
  providerMutationAttempts: NativeProviderMutationAction[] = [];
  identityAdmissions: ProviderTarget[] = [];
  counters = freshCounters();

  completeRequest(
    targets: readonly { readonly provider: ProviderTarget["provider"]; readonly home: string }[]
  ): CompleteTestInput {
    return this.completeRequestFor(this.activeCompleteSnapshot, targets);
  }

  useCompleteSnapshot(
    snapshot: Extract<VerifiedArtifactSnapshotV1, { readonly kind: "complete-set" }>
  ): void {
    this.activeCompleteSnapshot = snapshot;
  }

  completeRequestFor(
    snapshot: Extract<VerifiedArtifactSnapshotV1, { readonly kind: "complete-set" }>,
    targets: readonly { readonly provider: ProviderTarget["provider"]; readonly home: string }[]
  ): CompleteTestInput {
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

  resetCounters(): void {
    this.counters = freshCounters();
    this.providerMutationAttempts = [];
    this.identityAdmissions = [];
    this.inventoryInspectionAuthorities.length = 0;
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
    priorProjectionDigest = `ap1_${"e".repeat(64)}` as ProjectionDigest
  ): void {
    const prior = this.receiptFor(target);
    if (prior === null) throw new Error("receipt fixture missing");
    const priorFingerprint =
      `pm1_${"f".repeat(64)}` as NativeMemberObservation["memberFingerprint"];
    const members = [...(this.native.get(target.home) ?? [])];
    const alphaIndex = members.findIndex((member) => member.pluginId === "alpha");
    const alpha = members[alphaIndex];
    if (alpha === undefined) throw new Error("alpha member fixture missing");
    members[alphaIndex] = Object.freeze({ ...alpha, memberFingerprint: priorFingerprint });
    this.native.set(target.home, members);
    this.archivedFingerprints.add(priorFingerprint);

    const managedMembers = prior.body.managedMembers.map((member) =>
      Object.freeze({
        ...member,
        sourceProjectionDigest: priorProjectionDigest,
        memberFingerprint:
          member.pluginId === "alpha" ? priorFingerprint : member.memberFingerprint,
      })
    );
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
    this.marketplaces.set(
      target.home,
      Object.freeze({ kind: "present", state: marketplaceState(registration) })
    );
  }

  dropArchivedSource(target: { readonly home: string }, pluginId: string): void {
    const member = (this.native.get(target.home) ?? []).find(
      (candidate) => candidate.pluginId === pluginId
    );
    if (member === undefined) throw new Error("native member fixture missing");
    this.archivedFingerprints.delete(member.memberFingerprint);
  }

  addUnmanagedMember(
    target: { readonly home: string },
    pluginId: string,
    nativeIdentity: string
  ): void {
    const members = [...(this.native.get(target.home) ?? [])];
    const projection = this.projection();
    members.push(
      observedMember(
        mustTarget(target),
        pluginId,
        nativeIdentity,
        "d",
        projection.artifactAuthority,
        projection.members[0]!.providerSourceIdentity
      )
    );
    this.native.set(target.home, members);
  }

  addExternalMember(
    target: { readonly home: string },
    pluginId: string,
    nativeIdentity: string
  ): void {
    const members = [...(this.native.get(target.home) ?? [])];
    const projection = this.projection();
    const external = "competing-content-authority" as ProviderSourceIdentity;
    members.push(
      observedMember(
        mustTarget(target),
        pluginId,
        nativeIdentity,
        "d",
        Object.freeze({ ...projection.artifactAuthority, contentAuthority: external }),
        external
      )
    );
    this.native.set(target.home, members);
  }

  addUnclaimedNativeMember(target: { readonly home: string }, pluginId: string): void {
    const parsedTarget = mustTarget(target);
    const projection = this.projection();
    const members = [...(this.native.get(target.home) ?? [])];
    members.push(
      observedMember(
        parsedTarget,
        pluginId,
        `rawr:${pluginId}`,
        "e",
        projection.artifactAuthority,
        projection.members[0]!.providerSourceIdentity
      )
    );
    this.native.set(target.home, members);
  }

  addUnrelatedStandaloneExposure(target: { readonly home: string }): void {
    this.standaloneExposures.set(target.home, [
      Object.freeze({
        exposureKind: "installed",
        exposureIdentity: "manual:standalone:unrelated",
        nativeIdentity: "manual:unrelated",
        providerSourceIdentity: "competing-content-authority" as ProviderSourceIdentity,
        enablement: "enabled",
        visibleSkills: Object.freeze(["unrelated-skill"]),
        visibleHooks: Object.freeze(["unrelated-hook"]),
      }),
    ]);
  }

  addDesiredStandaloneCollision(
    target: { readonly home: string },
    claim: "hook" | "native" | "skill"
  ): void {
    const desired = this.projection().members[0]!;
    this.standaloneExposures.set(target.home, [
      Object.freeze({
        exposureKind: "installed",
        exposureIdentity: `manual:standalone:${claim}`,
        nativeIdentity: claim === "native" ? desired.nativeIdentity : `manual:${claim}`,
        providerSourceIdentity: "competing-content-authority" as ProviderSourceIdentity,
        enablement: "enabled",
        visibleSkills: Object.freeze(claim === "skill" ? [desired.visible.skills[0]!] : []),
        visibleHooks: Object.freeze(claim === "hook" ? [desired.visible.hooks[0]!] : []),
      }),
    ]);
  }

  seedDesiredPluginIdCollision(target: { readonly home: string }): void {
    const desired = this.projection().members[0]!;
    const parsedTarget = mustTarget(target);
    this.native.set(target.home, [
      observedMember(
        parsedTarget,
        desired.pluginId,
        `manual:${desired.pluginId}`,
        "d",
        desired.artifactAuthority,
        "competing-content-authority" as ProviderSourceIdentity
      ),
    ]);
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

  addStaleReceiptClaim(
    target: { readonly home: string },
    pluginId: string,
    includeLive = false
  ): void {
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
      projection.members[0]!.providerSourceIdentity
    );
    const managedMembers = [
      ...prior.body.managedMembers,
      {
        pluginId: claim.pluginId,
        nativeIdentity: claim.nativeIdentity,
        artifactAuthority: claim.artifactAuthority,
        providerSourceIdentity: claim.providerSourceIdentity,
        memberFingerprint: claim.memberFingerprint,
        sourceProjectionDigest: projection.projectionDigest,
      },
    ];
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
    this.receipts.set(
      target.home,
      createTargetReceipt({
        ...prior.body,
        generation: prior.body.generation + 1,
        lineage: { kind: "successor", priorReceiptDigest: prior.receiptDigest },
        marketplace: marketplaceState(registration),
        managedMembers,
      })
    );
    this.marketplaces.set(
      target.home,
      Object.freeze({ kind: "present", state: marketplaceState(registration) })
    );
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
        marketplace
      ),
      marketplace,
      identity:
        sidecar === undefined
          ? Object.freeze({ kind: "absent" as const })
          : Object.freeze({ kind: "present" as const, sidecar }),
    });
  }

  providerMutationAttemptsFor(target: {
    readonly home: string;
  }): readonly NativeProviderMutationAction[] {
    return this.providerMutationAttempts.filter((action) => action.target.home === target.home);
  }

  identityAdmissionsFor(target: { readonly home: string }): readonly ProviderTarget[] {
    return this.identityAdmissions.filter((candidate) => candidate.home === target.home);
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
    this.marketplaces.set(
      target.home,
      Object.freeze({
        kind: "present",
        state: Object.freeze({
          ...marketplace.state,
          sourceDigest: `ps1_${"f".repeat(64)}` as typeof marketplace.state.sourceDigest,
        }),
      })
    );
  }

  assignCompetingMarketplaceIdentity(target: { readonly home: string }): void {
    const marketplace = this.marketplaceFor(target);
    if (marketplace.kind !== "present") throw new Error("marketplace fixture missing");
    this.marketplaces.set(
      target.home,
      Object.freeze({
        kind: "present",
        state: Object.freeze({
          ...marketplace.state,
          marketplaceIdentity: "competing-content-authority" as ProviderSourceIdentity,
        }),
      })
    );
  }

  assignCompetingReceiptAuthority(target: { readonly home: string }): void {
    const receipt = this.receiptFor(target);
    if (receipt === null) throw new Error("receipt fixture missing");
    this.receipts.set(
      target.home,
      createTargetReceipt({
        ...receipt.body,
        marketplace: Object.freeze({
          ...receipt.body.marketplace,
          marketplaceIdentity: "competing-content-authority" as ProviderSourceIdentity,
        }),
      })
    );
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
    this.marketplaces.set(
      target.home,
      Object.freeze({ kind: "present", state: marketplaceState(registration) })
    );
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
        projectionAdapterProtocol: (target: ProviderTarget) =>
          success(
            target.provider === "codex" ? this.protocol : mustProtocol("claude-native-adapter@v1")
          ),
        inspectCapabilities: async (target: ProviderTarget) => {
          this.counters.capabilityReads += 1;
          if (target.home === this.failCapabilityReadHome) {
            return failure([
              issue(
                "CAPABILITY_MISMATCH",
                "target.capabilities",
                "Injected capability read failure"
              ),
            ]);
          }
          const available =
            this.missingCapabilitiesHome === target.home
              ? ALL_CAPABILITIES.filter((entry) => entry !== "native-plugin-retire")
              : ALL_CAPABILITIES;
          return success({
            provider: target.provider,
            adapterProtocol:
              target.provider === "codex"
                ? this.protocol
                : mustProtocol("claude-native-adapter@v1"),
            available,
          });
        },
        readInventory: async (target: ProviderTarget, contentAuthority?: ContentAuthority) => {
          this.counters.inventoryReads += 1;
          this.inventoryInspectionAuthorities.push(contentAuthority);
          return success(
            createProviderInventory(
              target,
              this.native.get(target.home) ?? [],
              this.standaloneExposures.get(target.home) ?? [],
              this.marketplaces.get(target.home) ?? Object.freeze({ kind: "absent" })
            )
          );
        },
        verifyProjection: async (target: ProviderTarget, projection: AgentProviderProjection) => {
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
          const matches = projection.members.every((member) =>
            live.some(
              (candidate) =>
                candidate.pluginId === member.pluginId &&
                candidate.nativeIdentity === member.nativeIdentity &&
                candidate.memberFingerprint === member.memberFingerprint &&
                candidate.enablement === "enabled"
            )
          );
          return matches
            ? success({ visibleFingerprint: visibleFingerprint(members), members })
            : failure([
                issue("VISIBILITY_FAILED", "provider", "Projection is not provider-visible"),
              ]);
        },
      },
      receipts: {
        read: async (target: ProviderTarget) => {
          this.counters.receiptReads += 1;
          const receipt = this.receipts.get(target.home);
          return success<ReceiptObservation>(
            receipt === undefined ? { kind: "absent" } : { kind: "present", receipt }
          );
        },
      },
      identities: {
        read: async (target: ProviderTarget) => {
          this.counters.identityReads += 1;
          const sidecar = this.identities.get(target.home);
          return success<TargetIdentityObservation>(
            sidecar === undefined ? { kind: "absent" } : { kind: "present", sidecar }
          );
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
              return Object.freeze({
                kind: "not-applied" as const,
                issues: [
                  issue(
                    "MUTATION_FAILED",
                    "provider.marketplace",
                    "Injected marketplace mutation failure"
                  ),
                ] as const,
              });
            }
            const observation: ProviderMarketplaceObservation =
              action.registration === null
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
                  memberFingerprint:
                    `pm1_${"f".repeat(64)}` as NativeMemberObservation["memberFingerprint"],
                });
              }
              this.native.set(action.target.home, members);
            }
            if (action.role === this.uncertainMarketplaceRole) {
              return Object.freeze({
                kind: "uncertain" as const,
                lastKnown: "bridge-returned" as const,
                issues: [
                  issue(
                    "MUTATION_FAILED",
                    "provider.marketplace",
                    "Injected uncertain marketplace result"
                  ),
                ] as const,
              });
            }
            return Object.freeze({ kind: "applied" as const });
          }
          this.counters.nativeMutations += 1;
          if (action.kind === "InstallMember" && action.target.home === this.failInstallHome) {
            return Object.freeze({
              kind: "not-applied" as const,
              issues: [issue("MUTATION_FAILED", "provider", "Injected install failure")] as const,
            });
          }
          const members = [...(this.native.get(action.target.home) ?? [])];
          if (action.kind === "InstallMember") members.push(nativeMember(action.member, "enabled"));
          if (action.kind === "EnableMember")
            replaceMember(members, action.member.pluginId, nativeMember(action.member, "enabled"));
          if (
            action.kind === "RetireMember" &&
            action.target.home !== this.leaveRetiredVisibleHome
          ) {
            removeMember(members, action.member.pluginId);
            if (action.target.home === this.leaveRetiredResidueHome) {
              this.standaloneExposures.set(action.target.home, [
                Object.freeze({
                  exposureKind: "installed",
                  exposureIdentity: `${action.member.pluginId}@${action.member.providerSourceIdentity}`,
                  nativeIdentity: action.member.nativeIdentity,
                  providerSourceIdentity: action.member.providerSourceIdentity,
                  enablement: "enabled",
                  visibleSkills: Object.freeze([]),
                  visibleHooks: Object.freeze([]),
                }),
              ]);
            }
          }
          this.native.set(action.target.home, members);
          return Object.freeze({ kind: "applied" as const });
        },
      },
      receiptWriter: {
        publish: async (
          target: ProviderTarget,
          _prior: ReceiptObservation,
          receipt: TargetReceipt
        ) => {
          this.counters.receiptWrites += 1;
          if (target.home === this.failReceiptHome) {
            return failure([
              issue("RECEIPT_FAILED", "receipt", "Injected receipt publication failure"),
            ]);
          }
          this.receipts.set(target.home, receipt);
          return success(receipt);
        },
      },
      identityWriter: {
        admit: async (
          target: ProviderTarget,
          sidecar: Exclude<TargetIdentityObservation, { kind: "absent" }>["sidecar"]
        ) => {
          this.counters.identityWrites += 1;
          this.identityAdmissions.push(target);
          this.identities.set(target.home, sidecar);
          return success(sidecar);
        },
      },
      evidence: {
        inspect: async (digest: MechanicalEvidenceDigest) => {
          this.counters.evidenceReads += 1;
          const found = this.evidence.get(digest);
          return success<MechanicalEvidenceObservation>(
            found === undefined
              ? { kind: "missing" }
              : { kind: "present", handle: found.handle, bytes: new Uint8Array(found.bytes) }
          );
        },
        publish: async (value: MechanicalProviderEvidence) => {
          this.counters.evidencePublishes += 1;
          this.lastEvidenceAttempt = Object.freeze({
            evidenceDigest: value.evidenceDigest,
            bytes: new Uint8Array(value.bytes),
          });
          if (this.failEvidencePublish) {
            return failure([
              issue("EVIDENCE_FAILED", "evidence", "Injected evidence publication failure"),
            ]);
          }
          const handle = {
            evidenceDigest: value.evidenceDigest,
            artifactIdentity: `evidence/${value.evidenceDigest}`,
          };
          this.evidence.set(value.evidenceDigest, { bytes: new Uint8Array(value.bytes), handle });
          return success(handle);
        },
      },
      projectionMaterializer: {
        materialize: async (projection: AgentProviderProjection) => {
          this.counters.projectionMaterializations += 1;
          if (projection.provider === this.failProjectionMaterializationProvider) {
            return failure([
              issue(
                "PROJECTION_MISMATCH",
                "projection.materialization",
                "Injected provider projection materialization failure"
              ),
            ]);
          }
          for (const member of projection.members)
            this.archivedFingerprints.add(member.memberFingerprint);
          return success({
            kind: "published" as const,
            projectionDigest: projection.projectionDigest,
          });
        },
      },
      marketplaceMaterializer: {
        materialize: async (
          _provider: ProviderTarget["provider"],
          registration: ProviderMarketplaceRegistration
        ) => {
          this.counters.marketplaceMaterializations += 1;
          if (_provider === this.failMarketplaceMaterializationProvider) {
            return failure([
              issue(
                "PROJECTION_MISMATCH",
                "marketplace.materialization",
                "Injected provider marketplace materialization failure"
              ),
            ]);
          }
          if (
            registration.members.some(
              (member) => !this.archivedFingerprints.has(member.memberFingerprint)
            )
          ) {
            return failure([
              issue(
                "PROJECTION_MISMATCH",
                "marketplace.materialization",
                "marketplace member archive missing"
              ),
            ]);
          }
          return success({
            kind: "published" as const,
            projectionDigest: registration.projectionDigest,
            sourceDigest: registration.sourceDigest,
          });
        },
      },
    };
  }

  private projection() {
    const result = renderCompleteProjection("codex", this.protocol, this.activeCompleteSnapshot);
    if (!result.ok) throw new Error(result.issues[0].message);
    if (!this.syntheticDesiredHook) return result.value;
    return Object.freeze({
      ...result.value,
      members: Object.freeze(
        result.value.members.map((member) =>
          Object.freeze({
            ...member,
            visible: Object.freeze({ ...member.visible, hooks: Object.freeze(["session-start"]) }),
          })
        )
      ),
    });
  }

  private readArtifact(ref: ArtifactRef): VerifiedArtifactSnapshotV1 {
    if (ref.kind === "complete-set") {
      if (ref.releaseSetDigest === this.alphaOnlyCompleteSnapshot.ref.releaseSetDigest) {
        return this.alphaOnlyCompleteSnapshot;
      }
      if (ref.releaseSetDigest === this.activeCompleteSnapshot.ref.releaseSetDigest) {
        return this.activeCompleteSnapshot;
      }
      return this.completeSnapshot;
    }
    if (ref.releaseDigest === this.alpha.ref.releaseDigest) return this.alpha;
    if (ref.releaseDigest === this.beta.ref.releaseDigest) return this.beta;
    throw new Error("unknown artifact fixture");
  }
}

function sharedHookCompleteSnapshot(): Extract<
  VerifiedArtifactSnapshotV1,
  { readonly kind: "complete-set" }
> {
  const alphaPayload = must(
    createAgentPluginPayload([
      { path: "skills/alpha/SKILL.md", mode: 0o644, bytes: new TextEncoder().encode("alpha\n") },
      { path: "hooks/hooks.json", mode: 0o644, bytes: hookManifestBytes("Stop") },
    ])
  );
  const betaPayload = must(
    createAgentPluginPayload([
      { path: "skills/beta/SKILL.md", mode: 0o644, bytes: new TextEncoder().encode("beta\n") },
      { path: "hooks/hooks.json", mode: 0o644, bytes: hookManifestBytes("Stop") },
    ])
  );
  const releaseInput = must(
    createAgentPluginReleaseInput(releaseInputBody(alphaPayload, betaPayload))
  );
  const alpha = must(
    createAgentPluginRelease({
      releaseInput,
      pluginId: "alpha",
      source: SOURCE,
      payload: alphaPayload,
    })
  );
  const beta = must(
    createAgentPluginRelease({
      releaseInput,
      pluginId: "beta",
      source: SOURCE,
      payload: betaPayload,
    })
  );
  const releaseSet = must(createAgentPluginReleaseSet({ releaseInput, releases: [alpha, beta] }));
  return Object.freeze({
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(releaseSet.releaseSetDigest),
    releaseSet,
    members: Object.freeze([releaseSnapshot(alpha), releaseSnapshot(beta)]),
  });
}

function hookManifestBytes(...eventNames: readonly string[]): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      description: "Fixture hooks",
      hooks: Object.fromEntries(
        eventNames.map((eventName) => [
          eventName,
          [
            {
              hooks: [{ type: "command", command: "printf hook" }],
            },
          ],
        ])
      ),
    })
  );
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
  member: ProviderProjectionMember,
  enablement: "disabled" | "enabled"
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
  providerSourceIdentity: ProviderSourceIdentity
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

function mustTarget(target: {
  readonly home: string;
  readonly provider?: "codex" | "claude";
}): ProviderTarget {
  const parsed = parseProviderTarget({ provider: target.provider ?? "codex", home: target.home });
  if (!parsed.ok) throw new Error(parsed.issues[0].message);
  return parsed.value;
}

function replaceMember(
  members: NativeMemberObservation[],
  pluginId: string,
  next: NativeMemberObservation
): void {
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
    evidencePublishes: 0,
    projectionMaterializations: 0,
    marketplaceMaterializations: 0,
    marketplaceWrites: 0,
  };
}

const ALL_CAPABILITIES = Object.freeze([
  "native-plugin-enable",
  "native-plugin-install",
  "native-plugin-retire",
  "visible-hook-inventory",
  "visible-plugin-inventory",
  "visible-skill-inventory",
] satisfies readonly ProviderCapability[]);
