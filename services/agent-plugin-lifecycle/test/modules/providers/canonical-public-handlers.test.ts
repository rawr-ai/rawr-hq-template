import { Value } from "typebox/value";
import { describe, expect, it, vi } from "vitest";

import { createLifecycleTestClient, testInvocation } from "../../support/client";
import {
  createCompleteSetArtifactRef,
  parsePluginId,
  parseReleaseSetDigest,
  type ContentAuthority,
  type VerifiedArtifactSnapshotV1,
} from "../../../src/service/shared/release";
import type { CurrentMainSelectionResult } from "../../../src/service/modules/governance/model/dto/current-main";
import type {
  CanonicalNativeObservation,
  CanonicalNativeMutationAction,
  CanonicalTargetStatus,
  NativeMutationAttempt,
  ProviderLifecycleRuntime,
} from "../../../src/service/modules/providers/ports";
import { parseProviderTarget, type ProviderTarget } from "../../../src/service/modules/providers/model/dto/provider-target";
import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  type ProviderMarketplaceObservation,
} from "../../../src/service/modules/providers/model/policy/marketplace";
import type {
  AgentProviderProjection,
  ProviderProjectionMember,
} from "../../../src/service/modules/providers/model/policy/projection";
import {
  createProviderInventory,
  type NativeMemberObservation,
  type NativeStandaloneExposureObservation,
  type ProviderInventory,
} from "../../../src/service/modules/providers/model/policy/state-machine";
import {
  failure,
  issue,
  success,
} from "../../../src/service/modules/providers/model/errors/deployment-result";
import { CanonicalSyncResultSchema } from "../../../src/service/modules/providers/schemas";
import { desiredStateFixture } from "./canonical-fixture";

describe("canonical provider public handlers", () => {
  it("blocks a refused selection before artifact or native reads", async () => {
    const harness = new CanonicalHarness();
    harness.selectionResult = Object.freeze({
      kind: "DIRTY_REPOSITORY",
      reason: "canonical content workspace is dirty",
    });

    const result = await harness.sync();

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "Blocked",
        targets: [{ kind: "blocked", status: "BLOCKED_SELECTION", appliedPrefix: [] }],
      },
    });
    expect(harness.releaseRead).not.toHaveBeenCalled();
    harness.expectCanonicalNativeCold();
  });

  it("blocks an artifact identity mismatch before native observation", async () => {
    const harness = new CanonicalHarness();
    const other = mustReleaseSetDigest(`rs1_${"0".repeat(64)}`);
    harness.artifact = Object.freeze({
      ...harness.fixture.snapshot,
      ref: createCompleteSetArtifactRef(other),
    });

    const result = await harness.status();

    expect(result).toMatchObject({
      ok: true,
      value: [{ status: "BLOCKED_SELECTION" }],
    });
    expect(harness.releaseRead).toHaveBeenCalledOnce();
    harness.expectCanonicalNativeCold();
  });

  it("derives converged status from live native truth without materialization", async () => {
    const harness = new CanonicalHarness();

    const result = await harness.status();

    expect(result).toMatchObject({
      ok: true,
      value: [{ status: "CONVERGED", issues: [] }],
    });
    expect(harness.capabilities).toHaveBeenCalledOnce();
    expect(harness.observe).toHaveBeenCalledOnce();
    expect(harness.projectionMaterialize).not.toHaveBeenCalled();
    expect(harness.marketplaceMaterialize).not.toHaveBeenCalled();
    expect(harness.apply).not.toHaveBeenCalled();
    harness.expectLegacyStateCold();
  });

  it.each([
    {
      label: "ordinary native drift",
      expected: "DRIFTED",
      configure: (harness: CanonicalHarness) => {
        const projection = harness.projection("codex");
        const first = required(projection.members[0], "selected member");
        harness.setInventory(
          harness.codexTarget,
          [nativeWithEnablement(first, "disabled"), ...projection.members.slice(1).map(native)],
          Object.freeze({
            kind: "present",
            state: marketplaceState(marketplaceForProjection(projection)),
          }),
        );
      },
    },
    {
      label: "ambiguous native provenance",
      expected: "BLOCKED_COLLISION",
      configure: (harness: CanonicalHarness) => {
        harness.ambiguousProvenance.add(harness.codexTarget.targetDigest);
      },
    },
    {
      label: "incompatible native capabilities",
      expected: "INCOMPATIBLE_PROVIDER",
      configure: (harness: CanonicalHarness) => {
        harness.incompatible.add(harness.codexTarget.targetDigest);
      },
    },
    {
      label: "provider-home ownership collision",
      expected: "BLOCKED_COLLISION",
      configure: (harness: CanonicalHarness) => {
        harness.ownershipConflicts.add(harness.codexTarget.targetDigest);
      },
    },
    {
      label: "ordinary native observation failure",
      expected: "DRIFTED",
      configure: (harness: CanonicalHarness) => {
        harness.observationFailures.add(harness.codexTarget.targetDigest);
      },
    },
    {
      label: "provider-home collision discovered during observation",
      expected: "BLOCKED_COLLISION",
      configure: (harness: CanonicalHarness) => {
        harness.observationOwnershipConflicts.add(harness.codexTarget.targetDigest);
      },
    },
  ] satisfies readonly StatusScenario[])(
    "classifies $label without opening a mutation or legacy port",
    async ({ configure, expected }) => {
      const harness = new CanonicalHarness();
      configure(harness);

      const result = await harness.status();

      expect(result).toMatchObject({
        ok: true,
        value: [{ status: expected }],
      });
      harness.expectMutationPortsCold();
    },
  );

  it.each([
    {
      label: "projection",
      configure: (harness: CanonicalHarness) => {
        harness.failProjectionMaterialization = true;
      },
      timeline: ["materialize:projection"],
    },
    {
      label: "marketplace",
      configure: (harness: CanonicalHarness) => {
        harness.failMarketplaceMaterialization = true;
      },
      timeline: ["materialize:projection", "materialize:marketplace"],
    },
  ] as const)(
    "short-circuits native convergence when $label materialization fails",
    async ({ configure, timeline }) => {
      const harness = new CanonicalHarness();
      harness.setMarketplaceOnlyDrift();
      configure(harness);

      const result = await harness.sync();

      expect(result).toMatchObject({
        ok: true,
        value: {
          status: "Failed",
          targets: [{
            kind: "failed",
            status: "DRIFTED",
            appliedPrefix: [],
            issues: [{ code: "PROJECTION_MISMATCH" }],
          }],
        },
      });
      expect(harness.timeline).toEqual(timeline);
      expect(harness.capabilities).toHaveBeenCalledOnce();
      expect(harness.observe).toHaveBeenCalledOnce();
      expect(harness.apply).not.toHaveBeenCalled();
      harness.expectLegacyStateCold();
    },
  );

  it("rebuilds derived projection inputs before marketplace-only native drift", async () => {
    const harness = new CanonicalHarness();
    harness.setMarketplaceOnlyDrift();
    expect(harness.materializedProjectionDigests).toEqual(new Set());

    const first = await harness.sync();

    expect(first).toMatchObject({
      ok: true,
      value: {
        status: "Mutated",
        targets: [{
          kind: "mutated",
          status: "CONVERGED",
          appliedPrefix: [{ kind: "SetMarketplace" }],
        }],
      },
    });
    expect(harness.timeline).toEqual([
      "materialize:projection",
      "materialize:marketplace",
      "apply:SetMarketplace",
    ]);
    expect(harness.materializedProjectionDigests).toEqual(
      new Set([harness.projection("codex").projectionDigest]),
    );

    const counts = harness.readCounts();
    const second = await harness.sync();

    expect(second).toMatchObject({
      ok: true,
      value: {
        status: "ReadOnlyConverged",
        targets: [{ kind: "read-only-converged", appliedPrefix: [] }],
      },
    });
    expect(harness.apply).toHaveBeenCalledTimes(counts.apply);
    expect(harness.projectionMaterialize).toHaveBeenCalledTimes(counts.projectionMaterialize);
    expect(harness.marketplaceMaterialize).toHaveBeenCalledTimes(counts.marketplaceMaterialize);
    harness.expectLegacyStateCold();
  });

  it("refreshes a stale same-ID member, retires omission residue, then repeats read-only", async () => {
    const harness = new CanonicalHarness();
    const projection = harness.projection("codex");
    const alpha = required(projection.members[0], "selected alpha");
    const beta = required(projection.members[1], "selected beta");
    const staleAlpha = Object.freeze({
      ...native(alpha),
      visibleSkills: Object.freeze(["stale-alpha"]),
    });
    const omitted = Object.freeze({
      ...native(alpha),
      pluginId: mustPluginId("docs"),
      nativeIdentity: "rawr:docs",
      visibleSkills: Object.freeze(["docs"]),
      visibleHooks: Object.freeze([]),
    });
    const liveMembers = Object.freeze([staleAlpha, native(beta), omitted]);
    harness.setInventory(
      harness.codexTarget,
      liveMembers,
      marketplaceForMembers(projection, liveMembers),
    );

    const first = await harness.sync();

    expect(first).toMatchObject({
      ok: true,
      value: {
        status: "Mutated",
        targets: [{
          kind: "mutated",
          status: "CONVERGED",
          appliedPrefix: [
            { kind: "SetMarketplace" },
            { kind: "RetireMember", nativeIdentity: alpha.nativeIdentity },
            { kind: "InstallMember", nativeIdentity: alpha.nativeIdentity },
            { kind: "RetireMember", nativeIdentity: omitted.nativeIdentity },
          ],
        }],
      },
    });
    expect(harness.timeline.slice(0, 2)).toEqual([
      "materialize:projection",
      "materialize:marketplace",
    ]);
    expect(harness.apply.mock.calls.map(([action]) => action.kind)).toEqual([
      "SetMarketplace",
      "RetireMember",
      "InstallMember",
      "RetireMember",
    ]);
    expect(harness.inventory(harness.codexTarget).members.map((member) => member.pluginId))
      .toEqual(projection.members.map((member) => member.pluginId));

    const counts = harness.readCounts();
    const second = await harness.sync();

    expect(second).toMatchObject({
      ok: true,
      value: {
        status: "ReadOnlyConverged",
        targets: [{ kind: "read-only-converged", status: "CONVERGED", appliedPrefix: [] }],
      },
    });
    expect(harness.selectionResolve.mock.calls.length).toBeGreaterThan(counts.selection);
    expect(harness.releaseRead.mock.calls.length).toBeGreaterThan(counts.release);
    expect(harness.capabilities.mock.calls.length).toBeGreaterThan(counts.capabilities);
    expect(harness.observe.mock.calls.length).toBeGreaterThan(counts.observe);
    expect(harness.apply).toHaveBeenCalledTimes(counts.apply);
    expect(harness.projectionMaterialize).toHaveBeenCalledTimes(counts.projectionMaterialize);
    expect(harness.marketplaceMaterialize).toHaveBeenCalledTimes(counts.marketplaceMaterialize);
    harness.expectLegacyStateCold();
  });

  it("preserves the exact prefix when omitted-member retirement fails and converges on retry", async () => {
    const harness = new CanonicalHarness();
    const projection = harness.projection("codex");
    const alpha = required(projection.members[0], "selected alpha");
    const omitted = Object.freeze({
      ...native(alpha),
      pluginId: mustPluginId("docs"),
      nativeIdentity: "rawr:docs",
      visibleSkills: Object.freeze(["docs"]),
      visibleHooks: Object.freeze([]),
    });
    const liveMembers = Object.freeze([...projection.members.map(native), omitted]);
    harness.setInventory(
      harness.codexTarget,
      liveMembers,
      marketplaceForMembers(projection, liveMembers),
    );
    harness.failRetireNativeIdentity = omitted.nativeIdentity;

    const first = await harness.sync();

    expect(first).toMatchObject({
      ok: true,
      value: {
        status: "Failed",
        targets: [{
          kind: "failed",
          status: "DRIFTED",
          appliedPrefix: [{ kind: "SetMarketplace" }],
          issues: [{ code: "MUTATION_FAILED" }],
        }],
      },
    });
    expect(harness.apply.mock.calls.map(([action]) => action.kind)).toEqual([
      "SetMarketplace",
      "RetireMember",
    ]);
    expect(harness.observe).toHaveBeenCalledTimes(2);
    expect(harness.inventory(harness.codexTarget).members).toContainEqual(omitted);
    expect(harness.inventory(harness.codexTarget).marketplace).toEqual(Object.freeze({
      kind: "present",
      state: marketplaceState(marketplaceForProjection(projection)),
    }));

    const failedCounts = harness.readCounts();
    harness.failRetireNativeIdentity = null;
    const retry = await harness.sync();

    expect(retry).toMatchObject({
      ok: true,
      value: {
        status: "Mutated",
        targets: [{
          kind: "mutated",
          status: "CONVERGED",
          appliedPrefix: [{
            kind: "RetireMember",
            nativeIdentity: omitted.nativeIdentity,
          }],
        }],
      },
    });
    expect(harness.observe.mock.calls.length).toBeGreaterThan(failedCounts.observe);
    expect(harness.inventory(harness.codexTarget).members.map((member) => member.pluginId))
      .toEqual(projection.members.map((member) => member.pluginId));
    expect(harness.projectionMaterialize).toHaveBeenCalledTimes(failedCounts.projectionMaterialize);
    expect(harness.marketplaceMaterialize).toHaveBeenCalledTimes(failedCounts.marketplaceMaterialize);

    const convergedCounts = harness.readCounts();
    const repeat = await harness.sync();

    expect(repeat).toMatchObject({
      ok: true,
      value: {
        status: "ReadOnlyConverged",
        targets: [{ kind: "read-only-converged", appliedPrefix: [] }],
      },
    });
    expect(harness.apply).toHaveBeenCalledTimes(convergedCounts.apply);
    expect(harness.projectionMaterialize).toHaveBeenCalledTimes(convergedCounts.projectionMaterialize);
    expect(harness.marketplaceMaterialize).toHaveBeenCalledTimes(convergedCounts.marketplaceMaterialize);
    harness.expectLegacyStateCold();
  });

  it("retries omitted configured residue by exact selector then repeats read-only", async () => {
    const harness = new CanonicalHarness();
    const projection = harness.projection("codex");
    const configured: NativeStandaloneExposureObservation = Object.freeze({
      exposureKind: "configured-only",
      exposureIdentity: "plugins@rawr-hq",
      nativeIdentity: "rawr:plugins",
      providerSourceIdentity: projection.marketplace.identity,
      enablement: "enabled",
      visibleSkills: Object.freeze([]),
      visibleHooks: Object.freeze([]),
    });
    const initial = createProviderInventory(
      harness.codexTarget,
      projection.members.map(native),
      [configured],
      Object.freeze({ kind: "present", state: marketplaceState(marketplaceForProjection(projection)) }),
    );
    harness.setInventory(harness.codexTarget, initial);
    harness.failRetireExposureIdentity = configured.exposureIdentity;

    const failed = await harness.sync();

    expect(failed).toMatchObject({
      ok: true,
      value: {
        status: "Failed",
        targets: [{ kind: "failed", status: "DRIFTED", appliedPrefix: [] }],
      },
    });
    expect(harness.inventory(harness.codexTarget).standaloneExposures).toEqual([configured]);

    harness.failRetireExposureIdentity = null;
    const retry = await harness.sync();

    expect(retry).toMatchObject({
      ok: true,
      value: {
        status: "Mutated",
        targets: [{
          kind: "mutated",
          status: "CONVERGED",
          appliedPrefix: [{
            kind: "RetireConfiguredExposure",
            exposureIdentity: configured.exposureIdentity,
            nativeIdentity: configured.nativeIdentity,
            providerSourceIdentity: configured.providerSourceIdentity,
          }],
        }],
      },
    });
    expect(Value.Check(CanonicalSyncResultSchema, retry)).toBe(true);
    expect(harness.inventory(harness.codexTarget).standaloneExposures).toEqual([]);

    const mutationCount = harness.apply.mock.calls.length;
    const repeat = await harness.sync();
    expect(repeat).toMatchObject({
      ok: true,
      value: {
        status: "ReadOnlyConverged",
        targets: [{ kind: "read-only-converged", appliedPrefix: [] }],
      },
    });
    expect(harness.apply).toHaveBeenCalledTimes(mutationCount);
  });

  it("keeps a converged home truthful when a peer target is incompatible", async () => {
    const harness = new CanonicalHarness();
    const claude = mustTarget("claude", "/tmp/rawr-canonical-public-claude");
    harness.setInventory(claude, nativeProjectionInventory(claude, harness.projection("claude")));
    harness.incompatible.add(claude.targetDigest);

    const result = await harness.sync([harness.codexTarget, claude]);

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "PartialFailure",
        targets: expect.arrayContaining([
          expect.objectContaining({ kind: "read-only-converged", status: "CONVERGED" }),
          expect.objectContaining({ kind: "blocked", status: "INCOMPATIBLE_PROVIDER" }),
        ]),
      },
    });
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it("reports a provider-home ownership conflict as a blocked sync target", async () => {
    const harness = new CanonicalHarness();
    harness.ownershipConflicts.add(harness.codexTarget.targetDigest);

    const result = await harness.sync();

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "Blocked",
        targets: [{ kind: "blocked", status: "BLOCKED_COLLISION", appliedPrefix: [] }],
      },
    });
    expect(harness.observe).not.toHaveBeenCalled();
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it("keeps an apply-edge ownership collision uncertain with an empty confirmed prefix", async () => {
    const harness = new CanonicalHarness();
    harness.setMarketplaceOnlyDrift();
    harness.failMarketplaceWithOwnershipCollision = true;

    const result = await harness.sync();

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "Failed",
        targets: [{
          kind: "uncertain",
          status: "DRIFTED",
          appliedPrefix: [],
          attempted: { kind: "SetMarketplace" },
          lastKnown: "bridge-invoked",
          issues: [{ code: "BLOCKED_COLLISION", path: "target.home" }],
        }],
      },
    });
    expect(harness.apply).toHaveBeenCalledOnce();
  });
});

interface StatusScenario {
  readonly label: string;
  readonly expected: CanonicalTargetStatus;
  readonly configure: (harness: CanonicalHarness) => void;
}

class CanonicalHarness {
  readonly fixture = desiredStateFixture();
  readonly codexTarget = mustTarget("codex", "/tmp/rawr-canonical-public-codex");
  readonly timeline: string[] = [];
  readonly incompatible = new Set<string>();
  readonly ownershipConflicts = new Set<string>();
  readonly ambiguousProvenance = new Set<string>();
  readonly observationFailures = new Set<string>();
  readonly observationOwnershipConflicts = new Set<string>();
  readonly materializedProjectionDigests = new Set<string>();
  readonly inventories = new Map<string, ProviderInventory>();

  selectionResult: CurrentMainSelectionResult = Object.freeze({
    kind: "CURRENT_ELIGIBLE",
    selection: this.fixture.selection,
  });
  artifact: VerifiedArtifactSnapshotV1 = this.fixture.snapshot;
  failProjectionMaterialization = false;
  failMarketplaceMaterialization = false;
  failMarketplaceWithOwnershipCollision = false;
  failRetireNativeIdentity: string | null = null;
  failRetireExposureIdentity: string | null = null;

  readonly selectionResolve = vi.fn(async () => this.selectionResult);
  readonly releaseRead = vi.fn(async () => success(this.artifact));
  readonly capabilities = vi.fn(async (
    target: ProviderTarget,
    contentAuthority: ContentAuthority,
  ) => {
    this.requireAuthority(contentAuthority);
    if (this.ownershipConflicts.has(target.targetDigest)) {
      return failure([issue(
        "BLOCKED_COLLISION",
        "target.home",
        "injected provider-home ownership collision",
      )]);
    }
    if (this.incompatible.has(target.targetDigest)) {
      return Object.freeze({
        ok: false as const,
        issues: [Object.freeze({
          code: "CAPABILITY_MISMATCH" as const,
          path: "target.capabilities",
          message: "injected incompatible provider",
          expected: "selected capabilities",
          actual: "missing",
        })] as const,
      });
    }
    const projection = this.projection(target.provider);
    return success(Object.freeze({
      provider: target.provider,
      adapterProtocol: projection.adapterProtocol,
      available: projection.capabilityProfile.required,
    }));
  });
  readonly observe = vi.fn(async (
    target: ProviderTarget,
    contentAuthority: ContentAuthority,
  ) => {
    this.requireAuthority(contentAuthority);
    if (this.observationOwnershipConflicts.has(target.targetDigest)) {
      return failure([issue(
        "BLOCKED_COLLISION",
        "target.home",
        "injected provider-home ownership collision",
      )]);
    }
    if (this.observationFailures.has(target.targetDigest)) {
      return failure([issue(
        "VISIBILITY_FAILED",
        "target.inventory",
        "injected native observation failure",
      )]);
    }
    if (this.ambiguousProvenance.has(target.targetDigest)) {
      return success<CanonicalNativeObservation>(Object.freeze({
        kind: "ambiguous-provenance",
        target,
        reason: "injected ambiguous native provenance",
      }));
    }
    return success<CanonicalNativeObservation>(Object.freeze({
      kind: "observed",
      inventory: this.inventory(target),
    }));
  });
  readonly apply = vi.fn(async (action: CanonicalNativeMutationAction): Promise<NativeMutationAttempt> => {
    this.timeline.push(`apply:${action.kind}`);
    const before = this.inventory(action.target);
    if (action.kind === "SetMarketplace" && this.failMarketplaceWithOwnershipCollision) {
      return Object.freeze({
        kind: "uncertain",
        lastKnown: "bridge-invoked",
        issues: [issue(
          "BLOCKED_COLLISION",
          "target.home",
          "injected apply-edge provider-home ownership collision",
        )] as const,
      });
    }
    if (
      action.kind === "RetireMember"
      && action.member.nativeIdentity === this.failRetireNativeIdentity
    ) {
      return Object.freeze({
        kind: "not-applied",
        issues: [issue(
          "MUTATION_FAILED",
          "target.retire",
          "injected omitted-member retirement failure",
        )] as const,
      });
    }
    if (
      action.kind === "RetireConfiguredExposure"
      && action.exposure.exposureIdentity === this.failRetireExposureIdentity
    ) {
      return Object.freeze({
        kind: "not-applied",
        issues: [issue(
          "MUTATION_FAILED",
          "target.retireConfiguredExposure",
          "injected configured-selector retirement failure",
        )] as const,
      });
    }
    if (action.kind === "SetMarketplace") {
      const marketplace: ProviderMarketplaceObservation = action.registration === null
        ? Object.freeze({ kind: "absent" })
        : Object.freeze({ kind: "present", state: marketplaceState(action.registration) });
      this.setInventory(action.target, before.members, marketplace);
      return Object.freeze({ kind: "applied" });
    }
    if (action.kind === "RetireMember") {
      this.setInventory(
        action.target,
        before.members.filter((member) => member.nativeIdentity !== action.member.nativeIdentity),
        before.marketplace,
      );
      return Object.freeze({ kind: "applied" });
    }
    if (action.kind === "InstallMember") {
      this.setInventory(
        action.target,
        [...before.members, native(action.member)],
        before.marketplace,
      );
      return Object.freeze({ kind: "applied" });
    }
    if (action.kind === "RetireConfiguredExposure") {
      this.inventories.set(action.target.targetDigest, createProviderInventory(
        action.target,
        before.members,
        before.standaloneExposures.filter((exposure) =>
          exposure.exposureIdentity !== action.exposure.exposureIdentity
          || exposure.providerSourceIdentity !== action.exposure.providerSourceIdentity),
        before.marketplace,
      ));
      return Object.freeze({ kind: "applied" });
    }
    this.setInventory(
      action.target,
      before.members.map((member) => member.nativeIdentity === action.member.nativeIdentity
        ? Object.freeze({ ...member, enablement: "enabled" as const })
        : member),
      before.marketplace,
    );
    return Object.freeze({ kind: "applied" });
  });
  readonly projectionMaterialize = vi.fn(async (projection: AgentProviderProjection) => {
    this.timeline.push("materialize:projection");
    if (this.failProjectionMaterialization) {
      return failure([issue(
        "PROJECTION_MISMATCH",
        "projection.materialization",
        "injected projection materialization failure",
      )]);
    }
    this.materializedProjectionDigests.add(projection.projectionDigest);
    return success(Object.freeze({
      kind: "published" as const,
      projectionDigest: projection.projectionDigest,
    }));
  });
  readonly marketplaceMaterialize = vi.fn(async (
    _provider: ProviderTarget["provider"],
    registration: ReturnType<typeof createProviderMarketplaceRegistration>,
  ) => {
    this.timeline.push("materialize:marketplace");
    if (this.failMarketplaceMaterialization) {
      return failure([issue(
        "PROJECTION_MISMATCH",
        "marketplace.materialization",
        "injected marketplace materialization failure",
      )]);
    }
    if (registration.members.some((member) =>
      !this.materializedProjectionDigests.has(member.sourceProjectionDigest))) {
      return failure([issue(
        "PROJECTION_MISMATCH",
        "marketplace.materialization",
        "marketplace materialization requires freshly derived projection inputs",
      )]);
    }
    return success(Object.freeze({
      kind: "published" as const,
      projectionDigest: registration.projectionDigest,
      sourceDigest: registration.sourceDigest,
    }));
  });

  readonly receiptRead = vi.fn(async () => unexpected("receipt read"));
  readonly receiptWrite = vi.fn(async () => unexpected("receipt write"));
  readonly identityRead = vi.fn(async () => unexpected("identity read"));
  readonly identityReadAll = vi.fn(async () => unexpected("identity enumeration"));
  readonly identityWrite = vi.fn(async () => unexpected("identity write"));
  readonly evidenceInspect = vi.fn(async () => unexpected("evidence inspect"));
  readonly evidencePublish = vi.fn(async () => unexpected("evidence publish"));

  constructor() {
    this.setInventory(
      this.codexTarget,
      nativeProjectionInventory(this.codexTarget, this.projection("codex")),
    );
  }

  async sync(targets: readonly ProviderTarget[] = [this.codexTarget]) {
    return await createLifecycleTestClient({ providers: this.runtime() }).providers.canonicalSync({
      kind: "canonical-sync",
      channel: "current-main",
      locator: {
        repositoryIdentity: this.fixture.selection.sourceRepositoryIdentity,
        workspaceRoot: "/tmp/rawr-content",
      },
      targets: targets.map((target) => ({ provider: target.provider, home: target.home })),
    }, testInvocation);
  }

  async status(targets: readonly ProviderTarget[] = [this.codexTarget]) {
    return await createLifecycleTestClient({ providers: this.runtime() }).providers.canonicalStatus({
      kind: "canonical-status",
      channel: "current-main",
      locator: {
        repositoryIdentity: this.fixture.selection.sourceRepositoryIdentity,
        workspaceRoot: "/tmp/rawr-content",
      },
      targets: targets.map((target) => ({ provider: target.provider, home: target.home })),
    }, testInvocation);
  }

  runtime(): ProviderLifecycleRuntime {
    return {
      currentMain: { resolve: this.selectionResolve },
      releases: { read: this.releaseRead },
      canonicalNative: {
        inspectCapabilities: this.capabilities,
        observe: this.observe,
        apply: this.apply,
      },
      provider: {
        projectionAdapterProtocol: () => unexpected("legacy adapter protocol"),
        inspectCapabilities: async () => unexpected("legacy capability read"),
        readInventory: async () => unexpected("legacy inventory read"),
        verifyProjection: async () => unexpected("legacy visibility read"),
      },
      providerMutator: { apply: async () => unexpected("legacy native mutation") },
      receipts: { read: this.receiptRead },
      receiptWriter: { publish: this.receiptWrite },
      identities: { read: this.identityRead, readAll: this.identityReadAll },
      identityWriter: { admit: this.identityWrite },
      projectionMaterializer: { materialize: this.projectionMaterialize },
      marketplaceMaterializer: { materialize: this.marketplaceMaterialize },
      evidence: { inspect: this.evidenceInspect, publish: this.evidencePublish },
    };
  }

  projection(provider: "claude" | "codex") {
    return provider === "claude" ? this.fixture.projections[0] : this.fixture.projections[1];
  }

  inventory(target: ProviderTarget): ProviderInventory {
    return required(this.inventories.get(target.targetDigest), `inventory ${target.home}`);
  }

  setInventory(
    target: ProviderTarget,
    inventory: ProviderInventory,
  ): void;
  setInventory(
    target: ProviderTarget,
    members: readonly NativeMemberObservation[],
    marketplace: ProviderMarketplaceObservation,
  ): void;
  setInventory(
    target: ProviderTarget,
    inventoryOrMembers: ProviderInventory | readonly NativeMemberObservation[],
    marketplace?: ProviderMarketplaceObservation,
  ): void {
    const inventory = "inventoryFingerprint" in inventoryOrMembers
      ? inventoryOrMembers
      : createProviderInventory(
          target,
          inventoryOrMembers,
          this.inventory(target).standaloneExposures,
          required(marketplace, "marketplace"),
        );
    this.inventories.set(target.targetDigest, inventory);
  }

  setMarketplaceOnlyDrift(): void {
    const projection = this.projection("codex");
    const first = required(projection.members[0], "selected member");
    this.setInventory(
      this.codexTarget,
      projection.members.map(native),
      marketplaceForMembers(projection, [native(first)]),
    );
  }

  expectCanonicalNativeCold(): void {
    expect(this.capabilities).not.toHaveBeenCalled();
    expect(this.observe).not.toHaveBeenCalled();
    expect(this.apply).not.toHaveBeenCalled();
    expect(this.projectionMaterialize).not.toHaveBeenCalled();
    expect(this.marketplaceMaterialize).not.toHaveBeenCalled();
    this.expectLegacyStateCold();
  }

  expectLegacyStateCold(): void {
    expect(this.receiptRead).not.toHaveBeenCalled();
    expect(this.receiptWrite).not.toHaveBeenCalled();
    expect(this.identityRead).not.toHaveBeenCalled();
    expect(this.identityReadAll).not.toHaveBeenCalled();
    expect(this.identityWrite).not.toHaveBeenCalled();
    expect(this.evidenceInspect).not.toHaveBeenCalled();
    expect(this.evidencePublish).not.toHaveBeenCalled();
  }

  expectMutationPortsCold(): void {
    expect(this.apply).not.toHaveBeenCalled();
    expect(this.projectionMaterialize).not.toHaveBeenCalled();
    expect(this.marketplaceMaterialize).not.toHaveBeenCalled();
    this.expectLegacyStateCold();
  }

  readCounts() {
    return Object.freeze({
      selection: this.selectionResolve.mock.calls.length,
      release: this.releaseRead.mock.calls.length,
      capabilities: this.capabilities.mock.calls.length,
      observe: this.observe.mock.calls.length,
      apply: this.apply.mock.calls.length,
      projectionMaterialize: this.projectionMaterialize.mock.calls.length,
      marketplaceMaterialize: this.marketplaceMaterialize.mock.calls.length,
    });
  }

  private requireAuthority(authority: ContentAuthority): void {
    if (authority !== this.fixture.snapshot.releaseSet.body.contentAuthority) {
      throw new Error(`Unexpected content authority: ${authority}`);
    }
  }
}

function nativeProjectionInventory(
  target: ProviderTarget,
  projection: AgentProviderProjection,
): ProviderInventory {
  return createProviderInventory(
    target,
    projection.members.map(native),
    [],
    Object.freeze({
      kind: "present",
      state: marketplaceState(marketplaceForProjection(projection)),
    }),
  );
}

function native(member: ProviderProjectionMember): NativeMemberObservation {
  return Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    enablement: "enabled",
    visibleSkills: member.visible.skills,
    visibleHooks: member.visible.hooks,
  });
}

function nativeWithEnablement(
  member: ProviderProjectionMember,
  enablement: NativeMemberObservation["enablement"],
): NativeMemberObservation {
  return Object.freeze({ ...native(member), enablement });
}

function marketplaceForProjection(projection: AgentProviderProjection) {
  return createProviderMarketplaceRegistration({
    provider: projection.provider,
    adapterProtocol: projection.adapterProtocol,
    marketplaceIdentity: projection.marketplace.identity,
    members: projection.members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: projection.projectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
}

function marketplaceForMembers(
  projection: AgentProviderProjection,
  members: readonly NativeMemberObservation[],
): ProviderMarketplaceObservation {
  return Object.freeze({
    kind: "present",
    state: marketplaceState(createProviderMarketplaceRegistration({
      provider: projection.provider,
      adapterProtocol: projection.adapterProtocol,
      marketplaceIdentity: projection.marketplace.identity,
      members: members.map((member) => ({
        pluginId: member.pluginId,
        nativeIdentity: member.nativeIdentity,
        providerSourceIdentity: member.providerSourceIdentity,
        sourceProjectionDigest: projection.projectionDigest,
        memberFingerprint: member.memberFingerprint,
      })),
    })),
  });
}

function mustTarget(provider: "claude" | "codex", home: string): ProviderTarget {
  const target = parseProviderTarget({ provider, home });
  if (!target.ok) throw new Error(target.issues[0].message);
  return target.value;
}

function mustPluginId(value: string) {
  const pluginId = parsePluginId(value, "test.pluginId");
  if (!pluginId.ok) throw new Error(pluginId.issues[0].message);
  return pluginId.value;
}

function mustReleaseSetDigest(value: string) {
  const digest = parseReleaseSetDigest(value, "test.releaseSetDigest");
  if (!digest.ok) throw new Error(digest.issues[0].message);
  return digest.value;
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

function unexpected(label: string): never {
  throw new Error(`Unexpected ${label}`);
}
