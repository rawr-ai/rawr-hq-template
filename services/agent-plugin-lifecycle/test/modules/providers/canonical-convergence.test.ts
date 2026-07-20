import { describe, expect, it } from "vitest";

import type {
  CanonicalConvergencePlan,
  CanonicalNativeObservation,
} from "../../../src/service/modules/providers/model/dto/canonical-convergence";
import type { CanonicalChannelSelection } from "../../../src/service/modules/governance/model/dto/current-main";
import type { CanonicalDesiredState } from "../../../src/service/modules/providers/model/dto/canonical-desired-state";
import { parseProviderTarget } from "../../../src/service/modules/providers/model/dto/provider-target";
import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  type ProviderMarketplaceObservation,
} from "../../../src/service/modules/providers/model/policy/marketplace";
import {
  planCanonicalConvergence,
} from "../../../src/service/modules/providers/model/policy/canonical-convergence";
import type {
  AgentProviderProjection,
  CapabilityObservation,
  ProviderProjectionMember,
} from "../../../src/service/modules/providers/model/policy/projection";
import {
  createProviderInventory,
  type NativeMemberObservation,
  type NativeStandaloneExposureObservation,
} from "../../../src/service/modules/providers/model/policy/state-machine";

const TARGET = mustTarget();
const OWNER = "rawr-hq" as ProviderProjectionMember["providerSourceIdentity"];
const ADAPTER = "rawr-native-provider/codex@v1" as AgentProviderProjection["adapterProtocol"];
const AVAILABLE: CapabilityObservation["available"] = Object.freeze([
  "native-plugin-enable",
  "native-plugin-install",
  "native-plugin-retire",
  "visible-hook-inventory",
  "visible-plugin-inventory",
  "visible-skill-inventory",
]);
const CAPABILITIES = Object.freeze({
  provider: "codex",
  adapterProtocol: ADAPTER,
  available: AVAILABLE,
}) satisfies CapabilityObservation;

describe("canonical native convergence policy", () => {
  it("adopts exact native state without a receipt and preserves unrelated state", () => {
    const desired = projection([member("cognition", "a")]);
    const unrelated = standalone("local@personal", "rawr:local", "personal");
    const plan = makePlan(desired, observed(
      desired,
      [native(desired.members[0]!)],
      [unrelated],
    ));

    expect(plan.status).toBe("CONVERGED");
    expect(mutations(plan)).toEqual([]);
    expect(plan.steps.map((step) => step.kind)).toEqual(["verify-selected"]);
  });

  it.each([
    ["missing", Object.freeze([]), "InstallMember"],
    ["disabled", undefined, "EnableMember"],
  ] as const)("plans only the native %s-member delta", (_case, explicitMembers, expected) => {
    const desired = projection([member("cognition", "b")]);
    const live = explicitMembers ?? [native(desired.members[0]!, "disabled")];
    const plan = makePlan(desired, observed(desired, live));

    expect(plan.status).toBe("DRIFTED");
    expect(mutations(plan).map((action) => action.kind)).toEqual([expected]);
    expect(plan.steps.at(-1)?.kind).toBe("verify-selected");
  });

  it("refreshes one same-ID stale release before selected visibility", () => {
    const prior = projection([member("cognition", "c", "1")], "1");
    const desired = projection([member("cognition", "d", "2")], "2");
    const plan = makePlan(desired, observed(
      desired,
      [native(prior.members[0]!)],
      [],
      marketplace(prior),
    ));

    expect(plan.status).toBe("DRIFTED");
    expect(plan.steps.map(stepLabel)).toEqual([
      "mutate:SetMarketplace",
      "mutate:RetireMember",
      "verify-retired",
      "mutate:InstallMember",
      "verify-selected",
    ]);
  });

  it("refreshes a stale same-ID install when the marketplace is already current", () => {
    const prior = projection([member("cognition", "4", "4")], "4");
    const desired = projection([member("cognition", "5", "5")], "5");
    const result = makePlan(desired, observed(
      desired,
      [native(prior.members[0]!)],
    ));

    expect(result.status).toBe("DRIFTED");
    expect(result.steps.map(stepLabel)).toEqual([
      "mutate:RetireMember",
      "verify-retired",
      "mutate:InstallMember",
      "verify-selected",
    ]);
  });

  it("retires selected-owner config-only residue before reinstalling the same native selector", () => {
    const desired = projection([member("cognition", "6")], "6");
    const configured = standalone(
      "cognition@rawr-hq",
      desired.members[0]!.nativeIdentity,
      OWNER,
      "configured-only",
    );

    const plan = makePlan(desired, observed(desired, [], [configured]));

    expect(plan.status).toBe("DRIFTED");
    expect(plan.steps.map(stepLabel)).toEqual([
      "mutate:RetireConfiguredExposure",
      "verify-configured-retired",
      "mutate:InstallMember",
      "verify-selected",
    ]);
  });

  it("retires omitted selected-owner config only after selected visibility", () => {
    const desired = projection([member("cognition", "7")], "7");
    const configured = standalone(
      "plugins@rawr-hq",
      "rawr:plugins",
      OWNER,
      "configured-only",
    );

    const plan = makePlan(desired, observed(
      desired,
      desired.members.map((entry) => native(entry)),
      [configured],
    ));

    expect(plan.status).toBe("DRIFTED");
    expect(plan.steps.map(stepLabel)).toEqual([
      "verify-selected",
      "mutate:RetireConfiguredExposure",
      "verify-configured-retired",
      "verify-final",
    ]);
  });

  it("blocks installed selected-owner standalone state instead of treating it as config residue", () => {
    const desired = projection([member("cognition", "8")], "8");
    const installed = standalone("cognition@rawr-hq", "rawr:cognition", OWNER, "installed");

    const plan = makePlan(desired, observed(desired, [], [installed]));

    expect(plan.status).toBe("BLOCKED_COLLISION");
    expect(plan.steps).toEqual([]);
  });

  it("verifies selected visibility before retiring a proven omitted member", () => {
    const prior = projection([
      member("cognition", "e"),
      member("docs", "f"),
    ], "3");
    const desired = projection([prior.members[0]!], "3");
    const plan = makePlan(desired, observed(
      desired,
      prior.members.map((entry) => native(entry)),
      [standalone("local@personal", "rawr:local", "personal")],
      marketplace(prior),
    ));

    expect(plan.status).toBe("DRIFTED");
    expect(plan.steps.map(stepLabel)).toEqual([
      "mutate:SetMarketplace",
      "verify-selected",
      "mutate:RetireMember",
      "verify-retired",
      "verify-final",
    ]);
    expect(mutations(plan).some((action) =>
      action.kind === "RetireMember" && action.member.nativeIdentity === "rawr:local")).toBe(false);
  });

  it("preserves a foreign same-ID exposure while retiring the exact selected-owner omission", () => {
    const prior = projection([member("docs", "9")], "9");
    const desired = projection([member("cognition", "a")], "a");
    const omitted = native(prior.members[0]!);
    const foreign = standalone("docs@foreign", omitted.nativeIdentity, "foreign", "installed");

    const plan = makePlan(desired, observed(
      desired,
      [native(desired.members[0]!), omitted],
      [foreign],
      marketplace(prior),
    ));

    expect(plan.status).toBe("DRIFTED");
    const verification = plan.steps.find((step) => step.kind === "verify-retired");
    expect(verification).toMatchObject({
      nativeIdentity: omitted.nativeIdentity,
      providerSourceIdentity: OWNER,
    });
  });

  it.each([
    ["selected marketplace with foreign embedded provenance", "foreign-member"],
    ["foreign marketplace with selected-owner embedded provenance", "foreign-marketplace"],
  ] as const)("blocks %s without a native action", (_label, scenario) => {
    const desired = projection([member("cognition", "7")]);
    const selectedMember = native(desired.members[0]!);
    const observation = scenario === "foreign-member"
      ? observed(desired, [{
          ...selectedMember,
          providerSourceIdentity: "foreign" as typeof selectedMember.providerSourceIdentity,
          artifactAuthority: {
            ...selectedMember.artifactAuthority,
            contentAuthority: "foreign" as typeof selectedMember.artifactAuthority.contentAuthority,
          },
        }])
      : observed(desired, [selectedMember], [], marketplace(
          projection([
            member("foreign", "8", "8", "foreign" as typeof OWNER),
          ], "8", "foreign" as typeof OWNER),
        ));

    const result = makePlan(desired, observation);

    expect(result.status).toBe("BLOCKED_COLLISION");
    expect(result.steps).toEqual([]);
  });

  it("rejects a provider-mismatched target without a native action", () => {
    const desired = projection([member("cognition", "d")]);
    const result = planCanonicalConvergence({
      desired: desiredState(desired),
      capabilities: CAPABILITIES,
      observation: observed(
        desired,
        [],
        [],
        marketplace(desired),
        mustTarget("claude", "/tmp/rawr-canonical-policy-claude"),
      ),
    });

    expect(result.status).toBe("INCOMPATIBLE_PROVIDER");
    expect(result.steps).toEqual([]);
    expect(result.issues[0]?.code).toBe("PROJECTION_MISMATCH");
  });

  it("blocks a native ambiguity observation without converting it to drift", () => {
    const desired = projection([member("cognition", "9")]);
    const result = planCanonicalConvergence({
      desired: desiredState(desired),
      capabilities: {
        ...CAPABILITIES,
        adapterProtocol: "rawr-native-provider/codex@v9" as typeof ADAPTER,
      },
      observation: {
        kind: "ambiguous-provenance",
        target: TARGET,
        reason: "managed package omitted artifact authority",
      },
    });

    expect(result.status).toBe("BLOCKED_COLLISION");
    expect(result.steps).toEqual([]);
  });

  it("preserves a conflicting unmanaged exposure and blocks mutation", () => {
    const desired = projection([member("cognition", "a")]);
    const result = makePlan(desired, observed(
      desired,
      [],
      [standalone("cognition@foreign", "rawr:cognition", "foreign")],
    ));

    expect(result.status).toBe("BLOCKED_COLLISION");
    expect(result.steps).toEqual([]);
  });

  it.each([
    ["missing capability", {
      provider: "codex",
      adapterProtocol: ADAPTER,
      available: AVAILABLE.filter((entry) => entry !== "visible-hook-inventory"),
    }, "CAPABILITY_MISMATCH"],
    ["wrong adapter", {
      provider: "codex",
      adapterProtocol: "rawr-native-provider/codex@v9" as typeof ADAPTER,
      available: AVAILABLE,
    }, "ADAPTER_PROTOCOL_MISMATCH"],
    ["wrong provider", {
      provider: "claude",
      adapterProtocol: ADAPTER,
      available: AVAILABLE,
    }, "PROJECTION_MISMATCH"],
  ] as const)("reports an incompatible native %s without mutation", (_label, capabilities, code) => {
    const desired = projection([member("cognition", "c")]);
    const result = planCanonicalConvergence({
      desired: desiredState(desired),
      observation: observed(desired, []),
      capabilities,
    });

    expect(result.status).toBe("INCOMPATIBLE_PROVIDER");
    expect(result.steps).toEqual([]);
    expect(result.issues[0]?.code).toBe(code);
  });
});

function makePlan(
  desired: AgentProviderProjection,
  observation: CanonicalNativeObservation,
): CanonicalConvergencePlan {
  return planCanonicalConvergence({
    desired: desiredState(desired),
    observation,
    capabilities: CAPABILITIES,
  });
}

function desiredState(projection: AgentProviderProjection): CanonicalDesiredState<"codex"> {
  if (projection.provider !== "codex") {
    throw new Error("canonical convergence fixture requires a Codex projection");
  }
  const projections: CanonicalChannelSelection["projections"] = [
    Object.freeze({
      provider: "claude",
      rendererProtocol: "rawr-provider-renderer/claude@v1",
      adapterProtocol: "claude-native-adapter@v1",
      capabilityProfileDigest: `cp1_${"c".repeat(64)}`,
      projectionDigest: `ap1_${"c".repeat(64)}`,
    }),
    Object.freeze({
      provider: "codex",
      rendererProtocol: projection.rendererProtocol,
      adapterProtocol: projection.adapterProtocol,
      capabilityProfileDigest: projection.capabilityProfile.capabilityProfileDigest,
      projectionDigest: projection.projectionDigest,
    }),
  ];
  const selection: CanonicalChannelSelection = Object.freeze({
    currentMainDigest: `cm2_${"c".repeat(64)}`,
    contentAuthority: projection.artifactAuthority.contentAuthority,
    sourceRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
    sourceCommit: projection.artifactAuthority.sourceCommit,
    sourceTree: "f".repeat(40),
    releaseInputDigest: `ri1_${"e".repeat(64)}`,
    releaseSetDigest: projection.source.kind === "complete-set"
      ? projection.source.releaseSet.releaseSetDigest
      : `rs1_${"d".repeat(64)}`,
    evaluationProfile: "provider-smoke@v1",
    projections: Object.freeze(projections),
  });
  return Object.freeze({
    selection,
    projection: Object.freeze({ ...projection, provider: "codex" }),
  });
}

function observed(
  desired: AgentProviderProjection,
  members: readonly NativeMemberObservation[],
  standaloneExposures: readonly NativeStandaloneExposureObservation[] = [],
  marketplaceObservation: ProviderMarketplaceObservation = marketplace(desired),
  target = TARGET,
): CanonicalNativeObservation {
  return Object.freeze({
    kind: "observed",
    inventory: createProviderInventory(
      target,
      members,
      standaloneExposures,
      marketplaceObservation,
    ),
  });
}

function projection(
  members: readonly ProviderProjectionMember[],
  fill = "a",
  owner: ProviderProjectionMember["providerSourceIdentity"] = OWNER,
): AgentProviderProjection {
  const artifactAuthority = Object.freeze({
    protocol: "agent-plugin-artifact-authority@v1" as const,
    contentAuthority: owner,
    sourceCommit: fill.repeat(40) as ProviderProjectionMember["artifactAuthority"]["sourceCommit"],
  });
  return Object.freeze({
    schemaVersion: 1,
    provider: "codex",
    rendererProtocol: "rawr-provider-renderer/codex@v1",
    adapterProtocol: ADAPTER,
    artifactAuthority,
    source: {
      kind: "complete-set",
      releaseSet: { kind: "complete-set", releaseSetDigest: `rs1_${fill.repeat(64)}` },
    },
    marketplace: {
      identity: owner,
      sourceDigest: `ps1_${fill.repeat(64)}`,
      files: Object.freeze([]),
    },
    capabilityProfile: {
      schemaVersion: 1,
      provider: "codex",
      adapterProtocol: ADAPTER,
      required: Object.freeze([
        "native-plugin-enable",
        "native-plugin-install",
        "native-plugin-retire",
        "visible-hook-inventory",
        "visible-plugin-inventory",
        "visible-skill-inventory",
      ]),
      capabilityProfileDigest: `cp1_${fill.repeat(64)}`,
    },
    members: Object.freeze(members.map((entry) => Object.freeze({
      ...entry,
      artifactAuthority,
      providerSourceIdentity: owner,
    }))),
    projectionDigest: `ap1_${fill.repeat(64)}`,
  }) as unknown as AgentProviderProjection;
}

function member(
  pluginId: string,
  fingerprintFill: string,
  commitFill = "a",
  owner: ProviderProjectionMember["providerSourceIdentity"] = OWNER,
): ProviderProjectionMember {
  const nativeIdentity = `rawr:${pluginId}`;
  return {
    pluginId,
    releaseRef: {
      kind: "release",
      releaseDigest: `rl1_${fingerprintFill.repeat(64)}`,
      artifactDigest: `ar1_${fingerprintFill.repeat(64)}`,
    },
    artifactAuthority: {
      protocol: "agent-plugin-artifact-authority@v1",
      contentAuthority: owner,
      sourceCommit: commitFill.repeat(40),
    },
    providerSourceIdentity: owner,
    nativeIdentity,
    files: Object.freeze([]),
    visible: {
      pluginIdentity: nativeIdentity,
      skills: Object.freeze([`${pluginId}-skill`]),
      hooks: Object.freeze([`${pluginId}-hook`]),
    },
    memberFingerprint: `pm1_${fingerprintFill.repeat(64)}`,
  } as unknown as ProviderProjectionMember;
}

function native(
  desired: ProviderProjectionMember,
  enablement: NativeMemberObservation["enablement"] = "enabled",
): NativeMemberObservation {
  return Object.freeze({
    pluginId: desired.pluginId,
    nativeIdentity: desired.nativeIdentity,
    artifactAuthority: desired.artifactAuthority,
    providerSourceIdentity: desired.providerSourceIdentity,
    memberFingerprint: desired.memberFingerprint,
    enablement,
    visibleSkills: desired.visible.skills,
    visibleHooks: desired.visible.hooks,
  });
}

function standalone(
  exposureIdentity: string,
  nativeIdentity: string,
  providerSourceIdentity: string,
  exposureKind: NativeStandaloneExposureObservation["exposureKind"] = "installed",
): NativeStandaloneExposureObservation {
  return Object.freeze({
    exposureKind,
    exposureIdentity,
    nativeIdentity,
    providerSourceIdentity: providerSourceIdentity as NativeStandaloneExposureObservation["providerSourceIdentity"],
    enablement: "enabled",
    visibleSkills: Object.freeze([`${nativeIdentity}-skill`]),
    visibleHooks: Object.freeze([`${nativeIdentity}-hook`]),
  });
}

function marketplace(projection: AgentProviderProjection): ProviderMarketplaceObservation {
  return Object.freeze({
    kind: "present",
    state: marketplaceState(createProviderMarketplaceRegistration({
      provider: projection.provider,
      adapterProtocol: projection.adapterProtocol,
      marketplaceIdentity: projection.marketplace.identity,
      members: projection.members.map((entry) => ({
        pluginId: entry.pluginId,
        nativeIdentity: entry.nativeIdentity,
        providerSourceIdentity: entry.providerSourceIdentity,
        sourceProjectionDigest: projection.projectionDigest,
        memberFingerprint: entry.memberFingerprint,
      })),
    })),
  });
}

function mutations(plan: CanonicalConvergencePlan) {
  return plan.steps.flatMap((step) => step.kind === "mutate" ? [step.action] : []);
}

function stepLabel(step: CanonicalConvergencePlan["steps"][number]): string {
  return step.kind === "mutate" ? `mutate:${step.action.kind}` : step.kind;
}

function mustTarget(
  provider: "claude" | "codex" = "codex",
  home = "/tmp/rawr-canonical-policy",
) {
  const parsed = parseProviderTarget({ provider, home });
  if (!parsed.ok) throw new Error("Invalid provider target fixture");
  return parsed.value;
}
