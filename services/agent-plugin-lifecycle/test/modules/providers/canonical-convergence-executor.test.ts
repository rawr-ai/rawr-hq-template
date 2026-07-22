import { describe, expect, it, vi } from "vitest";

import { executeCanonicalConvergence } from "../../../src/service/modules/providers/router/canonical-convergence-executor";
import type {
  CanonicalConvergenceStep,
  CanonicalNativeMutationAction,
  CanonicalNativeObservation,
  CanonicalObservedConvergencePlan,
} from "../../../src/service/modules/providers/model/dto/canonical-convergence";
import {
  failure,
  issue,
  success,
  type DeploymentResult,
} from "../../../src/service/modules/providers/model/errors/deployment-result";
import { parseProviderTarget } from "../../../src/service/modules/providers/model/dto/provider-target";
import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
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
import type { NativeMutationAttempt } from "../../../src/service/modules/providers/model/repositories/provider";

const TARGET = mustTarget();
const OWNER = "rawr-hq" as ProviderProjectionMember["providerSourceIdentity"];
const ADAPTER = "rawr-native-provider/codex@v1" as AgentProviderProjection["adapterProtocol"];

describe("canonical convergence executor", () => {
  it("verifies a converged target without mutation", async () => {
    const selected = projection([member("cognition", "a")], "a");
    const live = inventory(selected, selected.members.map(native));
    const ports = queuedPorts([observed(live)], []);
    const result = await executeCanonicalConvergence(
      plan(
        selected,
        [{ kind: "verify-selected", target: TARGET, projection: selected }],
        "CONVERGED"
      ),
      ports
    );
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("Expected read-only convergence");
    expect(result.appliedPrefix).toEqual([]);
    expect(result.verifiedSteps.map(stepKind)).toEqual(["verify-selected"]);
    expect(result.finalInventory).toBe(live);
    expect(ports.observer.observe).toHaveBeenCalledExactlyOnceWith(TARGET);
    expect(ports.mutator.apply).not.toHaveBeenCalled();
  });

  it("executes replacement and omitted cleanup in exact forward order", async () => {
    const selected = projection([member("cognition", "b", "2")], "b");
    const prior = projection([member("cognition", "a", "1"), member("docs", "d", "1")], "a");
    const selectedMember = selected.members[0]!;
    const stale = native(prior.members[0]!);
    const omitted = native(prior.members[1]!);
    const registration = registrationFor(selected);
    const actions = [
      setMarketplace(registration, marketplaceFor(prior)),
      retire(stale, registration),
      install(selectedMember, registration),
      retire(omitted, registration),
    ] as const;
    const steps: readonly CanonicalConvergenceStep[] = [
      { kind: "mutate", action: actions[0] },
      { kind: "mutate", action: actions[1] },
      {
        kind: "verify-retired",
        target: TARGET,
        nativeIdentity: stale.nativeIdentity,
        providerSourceIdentity: stale.providerSourceIdentity,
      },
      { kind: "mutate", action: actions[2] },
      { kind: "verify-selected", target: TARGET, projection: selected },
      { kind: "mutate", action: actions[3] },
      {
        kind: "verify-retired",
        target: TARGET,
        nativeIdentity: omitted.nativeIdentity,
        providerSourceIdentity: omitted.providerSourceIdentity,
      },
      { kind: "verify-final", target: TARGET, projection: selected },
    ];
    const unrelated = exposure("local@personal", "rawr:local", "personal");
    const finalInventory = inventory(selected, [native(selectedMember)], [unrelated]);
    const ports = queuedPorts(
      [
        observed(inventory(selected, [omitted], [unrelated])),
        observed(inventory(selected, [native(selectedMember), omitted], [unrelated])),
        observed(finalInventory),
        observed(finalInventory),
      ],
      actions.map(() => applied())
    );
    const result = await executeCanonicalConvergence(plan(selected, steps), ports);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("Expected complete convergence");
    expect(result.appliedPrefix.map(actionKind)).toEqual([
      "SetMarketplace",
      "RetireMember",
      "InstallMember",
      "RetireMember",
    ]);
    expect(result.verifiedSteps.map(stepKind)).toEqual([
      "verify-retired",
      "verify-selected",
      "verify-retired",
      "verify-final",
    ]);
    expect(result.finalInventory).toBe(finalInventory);
    expect(ports.mutator.apply.mock.calls.map(([action]) => action.kind)).toEqual(
      result.appliedPrefix.map(actionKind)
    );
  });

  it("tracks configured-selector retirement in the exact prefix before same-ID install", async () => {
    const selected = projection([member("cognition", "k")], "k");
    const registration = registrationFor(selected);
    const configured = configuredExposure("cognition@rawr-hq", "rawr:cognition", OWNER);
    const cleanup = retireConfigured(configured, registration);
    const installAction = install(selected.members[0]!, registration);
    const finalInventory = inventory(selected, [native(selected.members[0]!)], []);
    const ports = queuedPorts(
      [observed(inventory(selected, [], [])), observed(finalInventory)],
      [applied(), applied()]
    );

    const result = await executeCanonicalConvergence(
      plan(selected, [
        { kind: "mutate", action: cleanup },
        {
          kind: "verify-configured-retired",
          target: TARGET,
          exposureIdentity: configured.exposureIdentity,
          providerSourceIdentity: configured.providerSourceIdentity,
        },
        { kind: "mutate", action: installAction },
        { kind: "verify-selected", target: TARGET, projection: selected },
      ]),
      ports
    );

    expect(result.kind).toBe("completed");
    expect(result.appliedPrefix.map(actionKind)).toEqual([
      "RetireConfiguredExposure",
      "InstallMember",
    ]);
    expect(result.verifiedSteps.map(stepKind)).toEqual([
      "verify-configured-retired",
      "verify-selected",
    ]);
  });

  it("verifies managed retirement by exact owner while preserving a foreign same-ID selector", async () => {
    const selected = projection([member("cognition", "m")], "m");
    const omitted = native(member("docs", "n"));
    const foreign = exposure("docs@foreign", omitted.nativeIdentity, "foreign");
    const cleanup = retire(omitted, registrationFor(selected));
    const selectedLive = native(selected.members[0]!);
    const finalInventory = inventory(selected, [selectedLive], [foreign]);
    const ports = queuedPorts(
      [
        observed(inventory(selected, [selectedLive, omitted], [foreign])),
        observed(finalInventory),
        observed(finalInventory),
      ],
      [applied()]
    );

    const result = await executeCanonicalConvergence(
      plan(selected, [
        { kind: "verify-selected", target: TARGET, projection: selected },
        { kind: "mutate", action: cleanup },
        {
          kind: "verify-retired",
          target: TARGET,
          nativeIdentity: omitted.nativeIdentity,
          providerSourceIdentity: omitted.providerSourceIdentity,
        },
        { kind: "verify-final", target: TARGET, projection: selected },
      ]),
      ports
    );

    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("Expected exact retirement convergence");
    expect(result.finalInventory.standaloneExposures).toEqual([foreign]);
  });

  it.each([
    ["not applied", notApplied(), "failed", null],
    ["uncertain before return", uncertain("bridge-invoked"), "uncertain", "bridge-invoked"],
    ["uncertain after return", uncertain("bridge-returned"), "uncertain", "bridge-returned"],
  ] as const)("stops after a %s attempt without extending its definite prefix", async (_label, secondAttempt, expectedKind, lastKnown) => {
    const selected = projection([member("cognition", "c")], "c");
    const registration = registrationFor(selected);
    const first = setMarketplace(registration, { kind: "absent" });
    const attempted = install(selected.members[0]!, registration);
    const ports = queuedPorts([], [applied(), secondAttempt]);
    const result = await executeCanonicalConvergence(
      plan(selected, [
        { kind: "mutate", action: first },
        { kind: "mutate", action: attempted },
        { kind: "verify-selected", target: TARGET, projection: selected },
      ]),
      ports
    );
    expect(result.kind).toBe(expectedKind);
    expect(result.appliedPrefix).toEqual([first]);
    expect(result.verifiedSteps).toEqual([]);
    expect(ports.mutator.apply).toHaveBeenCalledTimes(2);
    expect(ports.observer.observe).not.toHaveBeenCalled();
    if (result.kind === "uncertain") {
      expect(result.attempted).toBe(attempted);
      expect(result.lastKnown).toBe(lastKnown);
    }
  });

  it("rejects malformed plans before any provider call", async () => {
    const selected = projection([member("cognition", "i")], "i");
    const registration = registrationFor(selected);
    const wrongTargetAction = {
      ...install(selected.members[0]!, registration),
      target: mustTarget("/tmp/rawr-canonical-executor-other"),
    } as CanonicalNativeMutationAction;
    const malformedSteps: readonly (readonly CanonicalConvergenceStep[])[] = [
      [
        { kind: "mutate", action: wrongTargetAction },
        { kind: "verify-selected", target: TARGET, projection: selected },
      ],
      [
        {
          kind: "verify-retired",
          target: TARGET,
          nativeIdentity: "rawr:orphan",
          providerSourceIdentity: OWNER,
        },
        { kind: "verify-selected", target: TARGET, projection: selected },
      ],
    ];
    for (const steps of malformedSteps) {
      const ports = queuedPorts([], []);
      const result = await executeCanonicalConvergence(plan(selected, steps), ports);
      expect(result.kind).toBe("failed");
      expect(result.appliedPrefix).toEqual([]);
      expect(ports.observer.observe).not.toHaveBeenCalled();
      expect(ports.mutator.apply).not.toHaveBeenCalled();
    }
  });

  it.each([
    [
      "ordinary failure",
      failure([issue("VISIBILITY_FAILED", "target.inventory", "unavailable")]),
      "VISIBILITY_FAILED",
    ],
    [
      "ambiguous provenance",
      success({
        kind: "ambiguous-provenance",
        target: TARGET,
        reason: "invalid metadata",
      } as const),
      "BLOCKED_COLLISION",
    ],
  ] as const)("preserves the exact prefix on %s and stops the tail", async (_label, observation, expectedCode) => {
    const selected = projection([member("cognition", "j")], "j");
    const registration = registrationFor(selected);
    const transition = setMarketplace(registration, { kind: "absent" });
    const ports = queuedPorts([observation], [applied()]);
    const result = await executeCanonicalConvergence(
      plan(selected, [
        { kind: "mutate", action: transition },
        { kind: "verify-selected", target: TARGET, projection: selected },
        { kind: "mutate", action: install(selected.members[0]!, registration) },
        { kind: "verify-selected", target: TARGET, projection: selected },
      ]),
      ports
    );
    expect(result.kind).toBe("failed");
    expect(result.appliedPrefix).toEqual([transition]);
    expect(result.verifiedSteps).toEqual([]);
    if (result.kind === "failed") expect(result.issues[0].code).toBe(expectedCode);
    expect(ports.mutator.apply).toHaveBeenCalledExactlyOnceWith(transition);
    expect(ports.observer.observe).toHaveBeenCalledExactlyOnceWith(TARGET);
  });

  it.each([
    ["retired member remains", "member"],
    ["retired configuration remains", "configuration"],
    ["selected member is absent", "selected"],
  ] as const)("stops at the %s verification barrier", async (_label, scenario) => {
    const selected = projection([member("cognition", "d")], "d");
    const prior = projection([member("docs", "e")], "e");
    const registration = registrationFor(selected);
    const omitted = native(prior.members[0]!);
    const cleanup = retire(omitted, registration);
    const transition = setMarketplace(registration, marketplaceFor(prior));
    const selectedLive = native(selected.members[0]!);
    const members =
      scenario === "member" ? [omitted] : scenario === "selected" ? [omitted] : [selectedLive];
    const exposures =
      scenario === "configuration" ? [exposure("docs@rawr-hq", omitted.nativeIdentity, OWNER)] : [];
    const steps: readonly CanonicalConvergenceStep[] =
      scenario === "selected"
        ? [
            { kind: "mutate", action: transition },
            { kind: "verify-selected", target: TARGET, projection: selected },
            { kind: "mutate", action: cleanup },
            {
              kind: "verify-retired",
              target: TARGET,
              nativeIdentity: omitted.nativeIdentity,
              providerSourceIdentity: omitted.providerSourceIdentity,
            },
            { kind: "verify-final", target: TARGET, projection: selected },
          ]
        : [
            { kind: "mutate", action: cleanup },
            {
              kind: "verify-retired",
              target: TARGET,
              nativeIdentity: omitted.nativeIdentity,
              providerSourceIdentity: omitted.providerSourceIdentity,
            },
            { kind: "mutate", action: install(selected.members[0]!, registration) },
            { kind: "verify-selected", target: TARGET, projection: selected },
          ];
    const ports = queuedPorts([observed(inventory(selected, members, exposures))], [applied()]);
    const result = await executeCanonicalConvergence(plan(selected, steps), ports);
    expect(result.kind).toBe("failed");
    expect(result.appliedPrefix.map(actionKind)).toEqual([
      scenario === "selected" ? "SetMarketplace" : "RetireMember",
    ]);
    expect(result.verifiedSteps).toEqual([]);
    expect(ports.mutator.apply).toHaveBeenCalledTimes(1);
    expect(ports.observer.observe).toHaveBeenCalledTimes(1);
  });

  it("rejects final selected-owner residue after selected visibility and cleanup", async () => {
    const selected = projection([member("cognition", "f")], "f");
    const omitted = native(member("docs", "g"));
    const unexpected = native(member("governance", "h"));
    const selectedLive = native(selected.members[0]!);
    const cleanup = retire(omitted, registrationFor(selected));
    const residual = inventory(selected, [selectedLive, unexpected]);
    const ports = queuedPorts(
      [
        observed(inventory(selected, [selectedLive, omitted])),
        observed(residual),
        observed(residual),
      ],
      [applied()]
    );
    const result = await executeCanonicalConvergence(
      plan(selected, [
        { kind: "verify-selected", target: TARGET, projection: selected },
        { kind: "mutate", action: cleanup },
        {
          kind: "verify-retired",
          target: TARGET,
          nativeIdentity: omitted.nativeIdentity,
          providerSourceIdentity: omitted.providerSourceIdentity,
        },
        { kind: "verify-final", target: TARGET, projection: selected },
      ]),
      ports
    );
    expect(result.kind).toBe("failed");
    expect(result.appliedPrefix).toEqual([cleanup]);
    expect(result.verifiedSteps.map(stepKind)).toEqual(["verify-selected", "verify-retired"]);
    expect(ports.mutator.apply).toHaveBeenCalledExactlyOnceWith(cleanup);
    expect(ports.observer.observe).toHaveBeenCalledTimes(3);
  });
});

function plan(
  projection: AgentProviderProjection,
  steps: readonly CanonicalConvergenceStep[],
  status: CanonicalObservedConvergencePlan["status"] = "DRIFTED"
): CanonicalObservedConvergencePlan {
  return { status, target: TARGET, projection, steps, issues: [] };
}

function queuedPorts(
  observations: readonly DeploymentResult<CanonicalNativeObservation>[],
  attempts: readonly NativeMutationAttempt[]
) {
  const observationQueue = [...observations];
  const attemptQueue = [...attempts];
  return {
    observer: { observe: vi.fn(async () => required(observationQueue.shift(), "observation")) },
    mutator: {
      apply: vi.fn(async (_action: CanonicalNativeMutationAction) =>
        required(attemptQueue.shift(), "mutation")
      ),
    },
  };
}

function observed(value: ProviderInventory): DeploymentResult<CanonicalNativeObservation> {
  return success({ kind: "observed", inventory: value });
}

function applied(): NativeMutationAttempt {
  return { kind: "applied" };
}
function notApplied(): NativeMutationAttempt {
  return { kind: "not-applied", issues: [issue("MUTATION_FAILED", "target.mutation", "refused")] };
}
function uncertain(lastKnown: "bridge-invoked" | "bridge-returned"): NativeMutationAttempt {
  return {
    kind: "uncertain",
    lastKnown,
    issues: [issue("MUTATION_FAILED", "target.mutation", "unknown")],
  };
}

function projection(
  members: readonly ProviderProjectionMember[],
  fill: string
): AgentProviderProjection {
  const artifactAuthority = {
    protocol: "agent-plugin-artifact-authority@v1",
    contentAuthority: OWNER,
    sourceCommit: fill.repeat(40),
  };
  return {
    provider: "codex",
    adapterProtocol: ADAPTER,
    artifactAuthority,
    marketplace: { identity: OWNER },
    members: members.map((entry) => ({
      ...entry,
      artifactAuthority,
      providerSourceIdentity: OWNER,
    })),
    projectionDigest: `ap1_${fill.repeat(64)}`,
  } as unknown as AgentProviderProjection;
}

function member(pluginId: string, fill: string, commitFill = "a"): ProviderProjectionMember {
  return {
    pluginId,
    nativeIdentity: `rawr:${pluginId}`,
    artifactAuthority: {
      protocol: "agent-plugin-artifact-authority@v1",
      contentAuthority: OWNER,
      sourceCommit: commitFill.repeat(40),
    },
    providerSourceIdentity: OWNER,
    visible: {
      pluginIdentity: `rawr:${pluginId}`,
      skills: [`${pluginId}-skill`],
      hooks: [`${pluginId}-hook`],
    },
    memberFingerprint: `pm1_${fill.repeat(64)}`,
  } as unknown as ProviderProjectionMember;
}

function native(member: ProviderProjectionMember): NativeMemberObservation {
  return {
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    enablement: "enabled",
    visibleSkills: member.visible.skills,
    visibleHooks: member.visible.hooks,
  };
}

function inventory(
  projection: AgentProviderProjection,
  members: readonly NativeMemberObservation[],
  exposures: readonly NativeStandaloneExposureObservation[] = []
): ProviderInventory {
  return createProviderInventory(TARGET, members, exposures, marketplaceFor(projection));
}

function registrationFor(projection: AgentProviderProjection): ProviderMarketplaceRegistration {
  return createProviderMarketplaceRegistration({
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
  });
}

function marketplaceFor(projection: AgentProviderProjection): ProviderMarketplaceObservation {
  return { kind: "present", state: marketplaceState(registrationFor(projection)) };
}

function setMarketplace(
  registration: ProviderMarketplaceRegistration,
  expected: ProviderMarketplaceObservation
): CanonicalNativeMutationAction {
  return { kind: "SetMarketplace", role: "final", target: TARGET, expected, registration };
}
function retire(
  member: NativeMemberObservation,
  activeMarketplace: ProviderMarketplaceRegistration
): CanonicalNativeMutationAction {
  return { kind: "RetireMember", target: TARGET, activeMarketplace, member };
}
function retireConfigured(
  configured: NativeStandaloneExposureObservation & { exposureKind: "configured-only" },
  activeMarketplace: ProviderMarketplaceRegistration
): CanonicalNativeMutationAction {
  return {
    kind: "RetireConfiguredExposure",
    target: TARGET,
    activeMarketplace,
    exposure: configured,
  };
}
function install(
  member: ProviderProjectionMember,
  activeMarketplace: ProviderMarketplaceRegistration
): CanonicalNativeMutationAction {
  return { kind: "InstallMember", target: TARGET, activeMarketplace, member };
}

function exposure(
  id: string,
  nativeIdentity: string,
  owner: string
): NativeStandaloneExposureObservation {
  return {
    exposureKind: "installed",
    exposureIdentity: id,
    nativeIdentity,
    providerSourceIdentity: owner as typeof OWNER,
    enablement: "enabled",
    visibleSkills: [],
    visibleHooks: [],
  };
}
function configuredExposure(
  id: string,
  nativeIdentity: string,
  owner: string
): NativeStandaloneExposureObservation & { exposureKind: "configured-only" } {
  return {
    exposureKind: "configured-only",
    exposureIdentity: id,
    nativeIdentity,
    providerSourceIdentity: owner as typeof OWNER,
    enablement: "enabled",
    visibleSkills: [],
    visibleHooks: [],
  };
}
function actionKind(action: CanonicalNativeMutationAction): string {
  return action.kind;
}
function stepKind(step: { readonly kind: string }): string {
  return step.kind;
}
function required<T>(value: T | undefined, kind: string): T {
  if (value === undefined) throw new Error(`Unexpected ${kind} call`);
  return value;
}
function mustTarget(home = "/tmp/rawr-canonical-executor") {
  const target = parseProviderTarget({ provider: "codex", home });
  if (!target.ok) throw new Error(target.issues[0].message);
  return target.value;
}
