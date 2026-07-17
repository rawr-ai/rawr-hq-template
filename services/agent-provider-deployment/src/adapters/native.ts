import type { PluginId } from "@rawr/agent-plugin-release";

import { compareCanonical } from "../domain/canonical";
import {
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "../domain/marketplace";
import type {
  AdapterProtocol,
  AgentProviderProjection,
  CapabilityObservation,
  ProviderArtifactAuthority,
  ProviderCapability,
  ProviderMemberFingerprint,
  ProjectionDigest,
  ProviderProjectionMember,
  ProviderSourceIdentity,
} from "../domain/projection";
import { visibleFingerprint, type VerifiedMemberIdentity } from "../domain/receipt";
import { failure, issue, success, type DeploymentResult } from "../domain/result";
import {
  createProviderInventory,
  hasProjectionExposureCollision,
  type NativeMemberObservation,
  type NativeStandaloneExposureObservation,
  type ProviderInventory,
} from "../domain/state";
import type { ProviderId, ProviderTarget } from "../domain/target";
import type {
  NativeMutationObservation,
  NativeProviderMutationAction,
  ProviderTargetMutator,
  ProviderTargetReader,
  ProviderVisibilityObservation,
} from "../ports/provider";
import type { ProviderMarketplaceSource, ProviderMarketplaceSourceReader } from "../ports/state";

type NativeMemberMutationAction = Exclude<NativeProviderMutationAction, { readonly kind: "SetMarketplace" }>;

export interface StableProjectionSource {
  readonly path: string;
  readonly projectionDigest: ProjectionDigest;
  readonly memberFingerprint: ProviderMemberFingerprint;
}

export interface StableProjectionSourceReader {
  read(input: Readonly<{
    target: ProviderTarget;
    projectionDigest: ProjectionDigest;
    member: ProviderProjectionMember;
  }>): Promise<DeploymentResult<StableProjectionSource>>;
}

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
    prior: ProviderMarketplaceObservation;
    registration: ProviderMarketplaceRegistration | null;
    source: ProviderMarketplaceSource | null;
  }>): Promise<void>;
  install(input: Readonly<{
    target: ProviderTarget;
    member: ProviderProjectionMember;
    source: StableProjectionSource;
  }>): Promise<void>;
  enable(input: Readonly<{
    target: ProviderTarget;
    member: ProviderProjectionMember;
  }>): Promise<void>;
  uninstall(input: Readonly<{
    target: ProviderTarget;
    prior: NativeMemberObservation;
  }>): Promise<void>;
}

export interface NativeProviderAdapter extends ProviderTargetReader, ProviderTargetMutator {}

export function createNativeProviderAdapter(input: Readonly<{
  provider: ProviderId;
  adapterProtocol: AdapterProtocol;
  bridge: NativeProviderBridge;
  marketplaceSources: ProviderMarketplaceSourceReader;
  projectionSources: StableProjectionSourceReader;
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
    const providerIssue = targetProviderIssue(target, input.provider);
    if (providerIssue !== undefined) return failure([providerIssue]);
    try {
      const observations = await input.bridge.inventory(target.home);
      const members: NativeMemberObservation[] = [];
      for (const [index, observation] of observations.members.entries()) {
        if (observation.marketplaceIdentity !== observation.providerSourceIdentity
          || observation.providerSourceIdentity !== observation.artifactAuthority.contentAuthority) {
          return failure([issue(
            "VISIBILITY_FAILED",
            `target.inventory[${index}].marketplaceIdentity`,
            "Native marketplace/source identity must match the verified content authority",
            observation.artifactAuthority.contentAuthority,
            observation.marketplaceIdentity,
          )]);
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
      return success(createProviderInventory(target, members, observations.standaloneExposures, observations.marketplace));
    } catch (error) {
      return failure([portFailure("VISIBILITY_FAILED", "target.inventory", error)]);
    }
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

  const apply = async (
    action: NativeProviderMutationAction,
  ): Promise<DeploymentResult<NativeMutationObservation>> => {
    const providerIssue = targetProviderIssue(action.target, input.provider);
    if (providerIssue !== undefined) return failure([providerIssue]);
    const beforeResult = await readInventory(action.target);
    if (!beforeResult.ok) return beforeResult;
    if (action.kind === "SetMarketplace") {
      const priorRegistrationMatches = action.prior.kind === "absent"
        ? action.priorRegistration === null
        : action.priorRegistration !== null && sameMarketplaceState(action.prior.state, action.priorRegistration);
      if (!priorRegistrationMatches || !sameMarketplaceObservation(beforeResult.value.marketplace, action.prior)) {
        return failure([issue(
          "MUTATION_FAILED",
          "target.mutation.SetMarketplace",
          "Live marketplace registration or its self-contained prior member table changed after planning",
        )]);
      }
      let source: ProviderMarketplaceSource | null = null;
      if (action.registration !== null) {
        const read = await input.marketplaceSources.read(action.target, action.registration);
        if (!read.ok) return read;
        if (
          read.value.projectionDigest !== action.registration.projectionDigest
          || read.value.sourceDigest !== action.registration.sourceDigest
        ) {
          return failure([issue(
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
          prior: action.prior,
          registration: action.registration,
          source,
        });
      } catch (error) {
        return failure([portFailure("MUTATION_FAILED", "target.mutation.SetMarketplace", error)]);
      }
      const afterResult = await readInventory(action.target);
      if (!afterResult.ok) return afterResult;
      const expected: ProviderMarketplaceObservation = action.registration === null
        ? Object.freeze({ kind: "absent" })
        : Object.freeze({ kind: "present", state: marketplaceState(action.registration) });
      if (!sameMarketplaceObservation(afterResult.value.marketplace, expected)) {
        return failure([issue(
          "MUTATION_FAILED",
          "target.mutation.SetMarketplace",
          "Native marketplace mutation did not produce its required visible post-state",
        )]);
      }
      return success(Object.freeze({ actionKind: action.kind, postMarketplace: afterResult.value.marketplace }));
    }
    const expectedActiveMarketplace: ProviderMarketplaceObservation = action.activeMarketplace === null
      ? Object.freeze({ kind: "absent" })
      : Object.freeze({ kind: "present", state: marketplaceState(action.activeMarketplace) });
    if (!sameMarketplaceObservation(beforeResult.value.marketplace, expectedActiveMarketplace)) {
      return failure([issue(
        "MUTATION_FAILED",
        `target.mutation.${action.kind}.activeMarketplace`,
        "Member mutation requires the exact active marketplace registration from its plan",
      )]);
    }
    const before = beforeResult.value.members.find((candidate) =>
      candidate.nativeIdentity === actionMemberIdentity(action));
    const precondition = mutationPrecondition(action, before);
    if (!precondition.ok) return precondition;

    try {
      switch (action.kind) {
        case "InstallMember": {
          const source = await input.projectionSources.read({
            target: action.target,
            projectionDigest: action.projectionDigest,
            member: action.member,
          });
          if (!source.ok) return source;
          if (
            source.value.projectionDigest !== action.projectionDigest
            || source.value.memberFingerprint !== action.member.memberFingerprint
          ) {
            return failure([issue(
              "MUTATION_FAILED",
              "projectionSource",
              "Stable projection source does not bind the requested projection and member",
              `${action.projectionDigest}/${action.member.memberFingerprint}`,
              `${source.value.projectionDigest}/${source.value.memberFingerprint}`,
            )]);
          }
          await input.bridge.install({ target: action.target, member: action.member, source: source.value });
          break;
        }
        case "EnableMember":
          await input.bridge.enable({ target: action.target, member: action.member });
          break;
        case "RetireMember":
          await input.bridge.uninstall({ target: action.target, prior: action.prior });
          break;
      }
    } catch (error) {
      return failure([portFailure("MUTATION_FAILED", `target.mutation.${action.kind}`, error)]);
    }

    const afterResult = await readInventory(action.target);
    if (!afterResult.ok) return afterResult;
    const postMember = afterResult.value.members.find((candidate) =>
      candidate.nativeIdentity === actionMemberIdentity(action)) ?? null;
    if (!mutationPostcondition(action, postMember)) {
      return failure([issue(
        "MUTATION_FAILED",
        `target.mutation.${action.kind}`,
        "Native mutation did not produce its required visible post-state",
        expectedPost(action),
        postMember?.memberFingerprint ?? "absent",
      )]);
    }
    return success(Object.freeze({ actionKind: action.kind, postMember }));
  };

  return Object.freeze({ projectionAdapterProtocol, inspectCapabilities, readInventory, verifyProjection, apply });
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
      return live !== undefined && sameNativeMember(live, action.prior)
        ? success(null)
        : failure([issue("MUTATION_FAILED", `target.mutation.${action.kind}`, "Live native member changed after planning", action.prior.memberFingerprint, live?.memberFingerprint ?? "absent")]);
    case "EnableMember":
      return live !== undefined
        && sameNativeMember(live, action.prior)
        && action.prior.pluginId === action.member.pluginId
        && action.prior.memberFingerprint === action.member.memberFingerprint
        && action.prior.enablement === "disabled"
        ? success(null)
        : failure([issue("MUTATION_FAILED", "target.mutation.EnableMember", "Only the exact disabled projected member can be enabled", action.member.memberFingerprint, live?.memberFingerprint ?? "absent")]);
  }
}

function mutationPostcondition(
  action: NativeMemberMutationAction,
  live: NativeMemberObservation | null,
): boolean {
  if (action.kind === "RetireMember") return live === null;
  if (live === null) return false;
  if (action.kind === "EnableMember") {
    return sameNativeMember(live, Object.freeze({ ...action.prior, enablement: "enabled" }));
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
  return action.kind === "RetireMember" ? action.prior.nativeIdentity : action.member.nativeIdentity;
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
