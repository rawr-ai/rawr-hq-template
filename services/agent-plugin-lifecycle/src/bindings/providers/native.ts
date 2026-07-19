import type { PluginId } from "../../service/shared/release";

import { compareCanonical } from "../../service/modules/providers/model/helpers/canonical";
import {
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "../../service/modules/providers/model/policy/marketplace";
import type {
  AdapterProtocol,
  AgentProviderProjection,
  CapabilityObservation,
  ProviderArtifactAuthority,
  ProviderCapability,
  ProviderMemberFingerprint,
  ProviderProjectionMember,
  ProviderSourceIdentity,
} from "../../service/modules/providers/model/policy/projection";
import { visibleFingerprint, type VerifiedMemberIdentity } from "../../service/modules/providers/model/policy/receipt";
import {
  failure,
  issue,
  success,
  type DeploymentResult,
  type NonEmptyReadonlyArray,
  type ProviderDeploymentIssue,
} from "../../service/modules/providers/model/errors/deployment-result";
import {
  createProviderInventory,
  hasProjectionExposureCollision,
  type NativeMemberObservation,
  type NativeStandaloneExposureObservation,
  type ProviderInventory,
} from "../../service/modules/providers/model/policy/state-machine";
import type { ProviderId, ProviderTarget } from "../../service/modules/providers/model/dto/provider-target";
import type { CanonicalNativeMutationAction } from "../../service/modules/providers/model/dto/canonical-convergence";
import type {
  NativeMutationAttempt,
  NativeProviderMutationAction,
  ProviderTargetMutator,
  ProviderTargetReader,
  ProviderVisibilityObservation,
} from "../../service/modules/providers/ports/provider";
import type { ProviderMarketplaceSource, ProviderMarketplaceSourceReader } from "../../service/modules/providers/ports/state";
import {
  isNativeProvenanceAmbiguity,
  type NativeProvenanceAmbiguityReason,
} from "./resource-provenance";

type NativeMemberMutationAction = Exclude<NativeProviderMutationAction, { readonly kind: "SetMarketplace" }>;
type RetireConfiguredExposureAction = Extract<CanonicalNativeMutationAction, {
  readonly kind: "RetireConfiguredExposure";
}>;
type NativeAdapterMutationAction = NativeProviderMutationAction | RetireConfiguredExposureAction;

export interface NativePluginProcessObservation {
  readonly pluginId: PluginId;
  readonly nativeIdentity: string;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly marketplaceIdentity: string;
  readonly memberFingerprint: ProviderMemberFingerprint;
  readonly enablement: "disabled" | "enabled";
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

export interface NativeCapabilityProbe {
  readonly adapterProtocol: AdapterProtocol;
  readonly available: readonly ProviderCapability[];
}

export interface NativeProviderBridge {
  probe(home: string): Promise<NativeCapabilityProbe>;
  inventory(home: string): Promise<Readonly<{
    marketplace: ProviderMarketplaceObservation;
    members: readonly NativePluginProcessObservation[];
    standaloneExposures: readonly NativeStandaloneExposureObservation[];
  }>>;
  setMarketplace(input: Readonly<{
    target: ProviderTarget;
    expected: ProviderMarketplaceObservation;
    registration: ProviderMarketplaceRegistration | null;
    source: ProviderMarketplaceSource | null;
  }>): Promise<void>;
  install(input: Readonly<{
    target: ProviderTarget;
    member: ProviderProjectionMember;
  }>): Promise<void>;
  enable(input: Readonly<{
    target: ProviderTarget;
    member: ProviderProjectionMember;
  }>): Promise<void>;
  uninstall(input: Readonly<{
    target: ProviderTarget;
    expected: NativeMemberObservation;
  }>): Promise<void>;
  retireConfiguredExposure(input: Readonly<{
    target: ProviderTarget;
    expected: RetireConfiguredExposureAction["exposure"];
  }>): Promise<void>;
}

export type NativeProviderInventoryBridge = Pick<NativeProviderBridge, "inventory">;

export type NativeInventoryInspection =
  | Readonly<{ kind: "observed"; inventory: ProviderInventory }>
  | Readonly<{
    kind: "ambiguous-provenance";
    reason: NativeProvenanceAmbiguityReason;
    issue: ProviderDeploymentIssue;
  }>
  | Readonly<{ kind: "failed"; issue: ProviderDeploymentIssue }>;

export interface NativeProviderObservationBridge {
  probe(home: string): Promise<NativeCapabilityProbe>;
  inventoryExposures(home: string): Promise<readonly NativeStandaloneExposureObservation[]>;
}

/**
 * Provider-wide observation deliberately reports every native identity as an
 * unowned exposure. It can block a collision, but cannot establish ownership
 * or expose a mutation operation.
 */
export interface NativeProviderObserver {
  inspectCapabilities(target: ProviderTarget): Promise<DeploymentResult<CapabilityObservation>>;
  readInventory(target: ProviderTarget): Promise<DeploymentResult<ProviderInventory>>;
}

export interface NativeProviderAdapter extends ProviderTargetReader, ProviderTargetMutator {
  applyCanonical(action: CanonicalNativeMutationAction): Promise<NativeMutationAttempt>;
}

export function createNativeProviderObserver(input: Readonly<{
  provider: ProviderId;
  adapterProtocol: AdapterProtocol;
  bridge: NativeProviderObservationBridge;
}>): NativeProviderObserver {
  const inspectCapabilities: NativeProviderObserver["inspectCapabilities"] = async (target) => {
    const providerIssue = targetProviderIssue(target, input.provider);
    if (providerIssue !== undefined) return failure([providerIssue]);
    try {
      const observation = await input.bridge.probe(target.home);
      if (observation.adapterProtocol !== input.adapterProtocol) {
        return failure([issue(
          "ADAPTER_PROTOCOL_MISMATCH",
          "target.adapterProtocol",
          "Native provider probe returned a different adapter protocol",
          input.adapterProtocol,
          observation.adapterProtocol,
        )]);
      }
      return success(Object.freeze({
        provider: input.provider,
        adapterProtocol: input.adapterProtocol,
        available: canonicalCapabilities(observation.available),
      }));
    } catch (error) {
      return failure([portFailure("CAPABILITY_MISMATCH", "target.capabilities", error)]);
    }
  };

  const readInventory: NativeProviderObserver["readInventory"] = async (target) => {
    const providerIssue = targetProviderIssue(target, input.provider);
    if (providerIssue !== undefined) return failure([providerIssue]);
    try {
      const exposures = (await input.bridge.inventoryExposures(target.home)).map((exposure) => Object.freeze({
        ...exposure,
        visibleSkills: canonicalNames(exposure.visibleSkills),
        visibleHooks: canonicalNames(exposure.visibleHooks),
      }));
      return success(createProviderInventory(target, Object.freeze([]), Object.freeze(exposures)));
    } catch (error) {
      return failure([portFailure("VISIBILITY_FAILED", "target.inventory", error)]);
    }
  };

  return Object.freeze({ inspectCapabilities, readInventory });
}

export function createNativeProviderAdapter(input: Readonly<{
  provider: ProviderId;
  adapterProtocol: AdapterProtocol;
  bridge: NativeProviderBridge;
  marketplaceSources: ProviderMarketplaceSourceReader;
}>): NativeProviderAdapter {
  const projectionAdapterProtocol = (
    target: ProviderTarget,
  ): DeploymentResult<AdapterProtocol> => {
    const providerIssue = targetProviderIssue(target, input.provider);
    return providerIssue === undefined
      ? success(input.adapterProtocol)
      : failure([providerIssue]);
  };

  const inspectCapabilities = async (
    target: ProviderTarget,
  ): Promise<DeploymentResult<CapabilityObservation>> => {
    const providerIssue = targetProviderIssue(target, input.provider);
    if (providerIssue !== undefined) return failure([providerIssue]);
    try {
      const observation = await input.bridge.probe(target.home);
      if (observation.adapterProtocol !== input.adapterProtocol) {
        return failure([issue(
          "ADAPTER_PROTOCOL_MISMATCH",
          "target.adapterProtocol",
          "Native provider probe returned a different adapter protocol",
          input.adapterProtocol,
          observation.adapterProtocol,
        )]);
      }
      return success(Object.freeze({
        provider: input.provider,
        adapterProtocol: input.adapterProtocol,
        available: canonicalCapabilities(observation.available),
      }));
    } catch (error) {
      return failure([portFailure("CAPABILITY_MISMATCH", "target.capabilities", error)]);
    }
  };

  const readInventory = async (
    target: ProviderTarget,
  ): Promise<DeploymentResult<ProviderInventory>> => {
    const inspection = await inspectNativeInventory({
      provider: input.provider,
      bridge: input.bridge,
      target,
    });
    return inspection.kind === "observed"
      ? success(inspection.inventory)
      : failure([inspection.issue]);
  };

  const verifyProjection = async (
    target: ProviderTarget,
    projection: AgentProviderProjection,
  ): Promise<DeploymentResult<ProviderVisibilityObservation>> => {
    if (projection.provider !== input.provider) {
      return failure([issue(
        "PROJECTION_MISMATCH",
        "projection.provider",
        "Projection provider does not match the native adapter",
        input.provider,
        projection.provider,
      )]);
    }
    if (projection.adapterProtocol !== input.adapterProtocol) {
      return failure([issue(
        "ADAPTER_PROTOCOL_MISMATCH",
        "projection.adapterProtocol",
        "Projection requires a different native adapter protocol",
        input.adapterProtocol,
        projection.adapterProtocol,
      )]);
    }
    const inventoryResult = await readInventory(target);
    if (!inventoryResult.ok) return inventoryResult;
    if (hasProjectionExposureCollision(inventoryResult.value, projection)) {
      return failure([issue(
        "BLOCKED_COLLISION",
        "target.inventory",
        "Native or standalone provider exposure conflicts with the projection",
      )]);
    }
    const verified: VerifiedMemberIdentity[] = [];
    for (const member of projection.members) {
      const live = inventoryResult.value.members.find((candidate) =>
        candidate.nativeIdentity === member.nativeIdentity);
      if (live === undefined || !memberIsVisible(live, member)) {
        return failure([issue(
          "VISIBILITY_FAILED",
          `target.members.${member.pluginId}`,
          "Native provider-visible state does not match the projection",
          member.memberFingerprint,
          live?.memberFingerprint ?? "absent",
        )]);
      }
      verified.push(Object.freeze({
        pluginId: member.pluginId,
        nativeIdentity: member.nativeIdentity,
        artifactAuthority: Object.freeze({ ...member.artifactAuthority }),
        providerSourceIdentity: member.providerSourceIdentity,
        memberFingerprint: member.memberFingerprint,
      }));
    }
    return success(Object.freeze({
      members: Object.freeze(verified),
      visibleFingerprint: visibleFingerprint(verified),
    }));
  };

  const applyMutation = async (
    action: NativeAdapterMutationAction,
  ): Promise<NativeMutationAttempt> => {
    const providerIssue = targetProviderIssue(action.target, input.provider);
    if (providerIssue !== undefined) return notApplied([providerIssue]);
    const beforeResult = await readInventory(action.target);
    if (!beforeResult.ok) return notApplied(beforeResult.issues);
    if (action.kind === "SetMarketplace") {
      if (!sameMarketplaceObservation(beforeResult.value.marketplace, action.expected)) {
        return notApplied([issue(
          "MUTATION_FAILED",
          "target.mutation.SetMarketplace",
          "Live marketplace registration changed after planning",
        )]);
      }
      let source: ProviderMarketplaceSource | null = null;
      if (action.registration !== null) {
        const read = await input.marketplaceSources.read(action.target, action.registration);
        if (!read.ok) return notApplied(read.issues);
        if (
          read.value.projectionDigest !== action.registration.projectionDigest
          || read.value.sourceDigest !== action.registration.sourceDigest
        ) {
          return notApplied([issue(
            "MUTATION_FAILED",
            "marketplaceSource",
            "Stable marketplace source does not bind the requested registration",
            `${action.registration.projectionDigest}/${action.registration.sourceDigest}`,
            `${read.value.projectionDigest}/${read.value.sourceDigest}`,
          )]);
        }
        source = read.value;
      }
      try {
        await input.bridge.setMarketplace({
          target: action.target,
          expected: action.expected,
          registration: action.registration,
          source,
        });
      } catch (error) {
        return uncertain("bridge-invoked", [portFailure("MUTATION_FAILED", "target.mutation.SetMarketplace", error)]);
      }
      const afterResult = await readInventory(action.target);
      if (!afterResult.ok) return uncertain("bridge-returned", afterResult.issues);
      const expected: ProviderMarketplaceObservation = action.registration === null
        ? Object.freeze({ kind: "absent" })
        : Object.freeze({ kind: "present", state: marketplaceState(action.registration) });
      if (!sameMarketplaceObservation(afterResult.value.marketplace, expected)) {
        return uncertain("bridge-returned", [issue(
          "MUTATION_FAILED",
          "target.mutation.SetMarketplace",
          "Native marketplace mutation did not produce its required visible post-state",
        )]);
      }
      return applied();
    }
    const expectedActiveMarketplace: ProviderMarketplaceObservation = action.activeMarketplace === null
      ? Object.freeze({ kind: "absent" })
      : Object.freeze({ kind: "present", state: marketplaceState(action.activeMarketplace) });
    if (!sameMarketplaceObservation(beforeResult.value.marketplace, expectedActiveMarketplace)) {
      return notApplied([issue(
        "MUTATION_FAILED",
        `target.mutation.${action.kind}.activeMarketplace`,
        "Member mutation requires the exact active marketplace registration from its plan",
      )]);
    }
    if (action.kind === "RetireConfiguredExposure") {
      const matching = beforeResult.value.standaloneExposures.filter((candidate) =>
        candidate.exposureIdentity === action.exposure.exposureIdentity
        && candidate.providerSourceIdentity === action.exposure.providerSourceIdentity);
      const live = matching[0];
      if (
        matching.length !== 1
        || live === undefined
        || !sameStandaloneExposure(live, action.exposure)
        || live.exposureKind !== "configured-only"
      ) {
        return notApplied([issue(
          "MUTATION_FAILED",
          "target.mutation.RetireConfiguredExposure",
          "Only the exact configured-only native selector can be retired",
          `${action.exposure.exposureIdentity}/${action.exposure.providerSourceIdentity}`,
          live === undefined
            ? "absent"
            : `${live.exposureIdentity}/${live.providerSourceIdentity}/${live.exposureKind}`,
        )]);
      }
      try {
        await input.bridge.retireConfiguredExposure({ target: action.target, expected: action.exposure });
      } catch (error) {
        return uncertain("bridge-invoked", [portFailure(
          "MUTATION_FAILED",
          "target.mutation.RetireConfiguredExposure",
          error,
        )]);
      }
      const afterResult = await readInventory(action.target);
      if (!afterResult.ok) return uncertain("bridge-returned", afterResult.issues);
      if (afterResult.value.standaloneExposures.some((candidate) =>
        candidate.exposureIdentity === action.exposure.exposureIdentity
        && candidate.providerSourceIdentity === action.exposure.providerSourceIdentity)) {
        return uncertain("bridge-returned", [issue(
          "MUTATION_FAILED",
          "target.mutation.RetireConfiguredExposure",
          "Native configuration retirement did not remove the exact selector exposure",
          "absent",
          `${action.exposure.exposureIdentity}/${action.exposure.providerSourceIdentity}`,
        )]);
      }
      return applied();
    }
    const before = beforeResult.value.members.find((candidate) =>
      candidate.nativeIdentity === actionMemberIdentity(action));
    const precondition = mutationPrecondition(action, before);
    if (!precondition.ok) return notApplied(precondition.issues);

    try {
      switch (action.kind) {
        case "InstallMember": {
          await input.bridge.install({ target: action.target, member: action.member });
          break;
        }
        case "EnableMember":
          await input.bridge.enable({ target: action.target, member: action.member });
          break;
        case "RetireMember":
          await input.bridge.uninstall({ target: action.target, expected: action.member });
          break;
      }
    } catch (error) {
      return uncertain("bridge-invoked", [portFailure("MUTATION_FAILED", `target.mutation.${action.kind}`, error)]);
    }

    const afterResult = await readInventory(action.target);
    if (!afterResult.ok) return uncertain("bridge-returned", afterResult.issues);
    const postMember = afterResult.value.members.find((candidate) =>
      candidate.nativeIdentity === actionMemberIdentity(action)) ?? null;
    if (!mutationPostcondition(action, postMember, afterResult.value)) {
      return uncertain("bridge-returned", [issue(
        "MUTATION_FAILED",
        `target.mutation.${action.kind}`,
        "Native mutation did not produce its required visible post-state",
        expectedPost(action),
        postMember?.memberFingerprint ?? "absent",
      )]);
    }
    return applied();
  };

  const apply = async (action: NativeProviderMutationAction): Promise<NativeMutationAttempt> =>
    await applyMutation(action);
  const applyCanonical = async (action: CanonicalNativeMutationAction): Promise<NativeMutationAttempt> =>
    await applyMutation(action);

  return Object.freeze({
    projectionAdapterProtocol,
    inspectCapabilities,
    readInventory,
    verifyProjection,
    apply,
    applyCanonical,
  });
}

export async function inspectNativeInventory(input: Readonly<{
  provider: ProviderId;
  bridge: NativeProviderInventoryBridge;
  target: ProviderTarget;
}>): Promise<NativeInventoryInspection> {
  const providerIssue = targetProviderIssue(input.target, input.provider);
  if (providerIssue !== undefined) {
    return Object.freeze({ kind: "failed", issue: providerIssue });
  }
  try {
    const observations = await input.bridge.inventory(input.target.home);
    const members: NativeMemberObservation[] = [];
    for (const [index, observation] of observations.members.entries()) {
      if (observation.marketplaceIdentity !== observation.providerSourceIdentity
        || observation.providerSourceIdentity !== observation.artifactAuthority.contentAuthority) {
        return Object.freeze({
          kind: "ambiguous-provenance",
          reason: "managed-member-owner-mismatch",
          issue: issue(
            "VISIBILITY_FAILED",
            `target.inventory[${index}].marketplaceIdentity`,
            "Native marketplace/source identity must match the verified content authority",
            observation.artifactAuthority.contentAuthority,
            observation.marketplaceIdentity,
          ),
        });
      }
      members.push(Object.freeze({
        pluginId: observation.pluginId,
        nativeIdentity: observation.nativeIdentity,
        artifactAuthority: Object.freeze({ ...observation.artifactAuthority }),
        providerSourceIdentity: observation.providerSourceIdentity,
        memberFingerprint: observation.memberFingerprint,
        enablement: observation.enablement,
        visibleSkills: canonicalNames(observation.visibleSkills),
        visibleHooks: canonicalNames(observation.visibleHooks),
      }));
    }
    return Object.freeze({
      kind: "observed",
      inventory: createProviderInventory(
        input.target,
        members,
        observations.standaloneExposures,
        observations.marketplace,
      ),
    });
  } catch (error) {
    const visibilityIssue = portFailure("VISIBILITY_FAILED", "target.inventory", error);
    return isNativeProvenanceAmbiguity(error)
      ? Object.freeze({
          kind: "ambiguous-provenance",
          reason: error.reason,
          issue: visibilityIssue,
        })
      : Object.freeze({ kind: "failed", issue: visibilityIssue });
  }
}

function mutationPrecondition(
  action: NativeMemberMutationAction,
  live: NativeMemberObservation | undefined,
): DeploymentResult<null> {
  switch (action.kind) {
    case "InstallMember":
      return live === undefined
        ? success(null)
        : failure([issue("BLOCKED_COLLISION", "target.mutation.InstallMember", "Native identity is already occupied", "absent", live.nativeIdentity)]);
    case "RetireMember":
      return live !== undefined && sameNativeMember(live, action.member)
        ? success(null)
        : failure([issue("MUTATION_FAILED", `target.mutation.${action.kind}`, "Live native member changed after planning", action.member.memberFingerprint, live?.memberFingerprint ?? "absent")]);
    case "EnableMember":
      return live !== undefined
        && matchesProjectedMember(live, action.member, "disabled")
        ? success(null)
        : failure([issue("MUTATION_FAILED", "target.mutation.EnableMember", "Only the exact disabled projected member can be enabled", action.member.memberFingerprint, live?.memberFingerprint ?? "absent")]);
  }
}

function mutationPostcondition(
  action: NativeMemberMutationAction,
  live: NativeMemberObservation | null,
  inventory: ProviderInventory,
): boolean {
  if (action.kind === "RetireMember") {
    return live === null && !inventory.standaloneExposures.some((exposure) =>
      exposure.nativeIdentity === action.member.nativeIdentity
      && exposure.providerSourceIdentity === action.member.providerSourceIdentity);
  }
  if (live === null) return false;
  if (action.kind === "EnableMember") {
    return matchesProjectedMember(live, action.member, "enabled");
  }
  return matchesProjectedMember(
    live,
    action.member,
    "enabled",
  );
}

function matchesProjectedMember(
  live: NativeMemberObservation,
  member: ProviderProjectionMember,
  enablement: NativeMemberObservation["enablement"],
): boolean {
  return live.pluginId === member.pluginId
    && live.nativeIdentity === member.nativeIdentity
    && sameArtifactAuthority(live.artifactAuthority, member.artifactAuthority)
    && live.providerSourceIdentity === member.providerSourceIdentity
    && live.memberFingerprint === member.memberFingerprint
    && live.enablement === enablement
    && sameNames(live.visibleSkills, member.visible.skills)
    && sameNames(live.visibleHooks, member.visible.hooks);
}

function memberIsVisible(
  live: NativeMemberObservation,
  member: ProviderProjectionMember,
): boolean {
  return live.pluginId === member.pluginId
    && live.nativeIdentity === member.nativeIdentity
    && sameArtifactAuthority(live.artifactAuthority, member.artifactAuthority)
    && live.providerSourceIdentity === member.providerSourceIdentity
    && live.memberFingerprint === member.memberFingerprint
    && live.enablement === "enabled"
    && sameNames(live.visibleSkills, member.visible.skills)
    && sameNames(live.visibleHooks, member.visible.hooks);
}

function sameNativeMember(left: NativeMemberObservation, right: NativeMemberObservation): boolean {
  return left.pluginId === right.pluginId
    && left.nativeIdentity === right.nativeIdentity
    && sameArtifactAuthority(left.artifactAuthority, right.artifactAuthority)
    && left.providerSourceIdentity === right.providerSourceIdentity
    && left.memberFingerprint === right.memberFingerprint
    && left.enablement === right.enablement
    && sameNames(left.visibleSkills, right.visibleSkills)
    && sameNames(left.visibleHooks, right.visibleHooks);
}

function sameStandaloneExposure(
  left: NativeStandaloneExposureObservation,
  right: NativeStandaloneExposureObservation,
): boolean {
  return left.exposureKind === right.exposureKind
    && left.exposureIdentity === right.exposureIdentity
    && left.nativeIdentity === right.nativeIdentity
    && left.providerSourceIdentity === right.providerSourceIdentity
    && left.enablement === right.enablement
    && sameNames(left.visibleSkills, right.visibleSkills)
    && sameNames(left.visibleHooks, right.visibleHooks);
}

function sameArtifactAuthority(left: ProviderArtifactAuthority, right: ProviderArtifactAuthority): boolean {
  return left.protocol === right.protocol
    && left.contentAuthority === right.contentAuthority
    && left.sourceCommit === right.sourceCommit;
}

function sameNames(left: readonly string[], right: readonly string[]): boolean {
  const a = canonicalNames(left);
  const b = canonicalNames(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameMarketplaceObservation(
  left: ProviderMarketplaceObservation,
  right: ProviderMarketplaceObservation,
): boolean {
  return left.kind === "absent"
    ? right.kind === "absent"
    : right.kind === "present" && sameMarketplaceState(left.state, right.state);
}

function canonicalNames(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareCanonical));
}

function canonicalCapabilities(values: readonly ProviderCapability[]): readonly ProviderCapability[] {
  return Object.freeze([...new Set(values)].sort(compareCanonical));
}

function actionMemberIdentity(action: NativeMemberMutationAction): string {
  return action.member.nativeIdentity;
}

function expectedPost(action: NativeMemberMutationAction): string {
  return action.kind === "RetireMember" ? "absent" : action.member.memberFingerprint;
}

function targetProviderIssue(target: ProviderTarget, provider: ProviderId) {
  return target.provider === provider
    ? undefined
    : issue(
      "UNSUPPORTED_PROVIDER",
      "target.provider",
      "Target belongs to another native provider adapter",
      provider,
      target.provider,
    );
}

function portFailure(
  code: "CAPABILITY_MISMATCH" | "MUTATION_FAILED" | "VISIBILITY_FAILED",
  path: string,
  error: unknown,
) {
  return issue(code, path, error instanceof Error ? error.message : String(error));
}

function applied(): NativeMutationAttempt {
  return Object.freeze({ kind: "applied" });
}

function notApplied(
  issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>,
): NativeMutationAttempt {
  return Object.freeze({ kind: "not-applied", issues });
}

function uncertain(
  lastKnown: Extract<NativeMutationAttempt, { kind: "uncertain" }>["lastKnown"],
  issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>,
): NativeMutationAttempt {
  return Object.freeze({ kind: "uncertain", lastKnown, issues });
}
