import type { ContentAuthority } from "../../../../shared/release";
import {
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "../domain/marketplace";
import { failure, issue, success, type DeploymentResult } from "../domain/result";
import type { NativeMemberObservation } from "../domain/state";
import type { ProviderId, ProviderTarget } from "../domain/target";
import type { ProviderMemberRestoreContext, ProviderOwnerRuntime } from "../ports/owner";
import type { NativeMemberRestorationPort } from "../ports/provider";
import type { PathlessProjectionStorage } from "./projection-storage";
import type { PathlessTargetState } from "./target-records";

export type NativeMemberRestorationPorts =
  | Readonly<Record<ProviderId, NativeMemberRestorationPort>>
  | ((provider: ProviderId, contentAuthority: ContentAuthority) => NativeMemberRestorationPort);

/** Owns provider inverse semantics while delegating state and native mutation mechanically. */
export function createProviderOwnerRuntime(input: Readonly<{
  projections: PathlessProjectionStorage;
  targets: PathlessTargetState;
  members: NativeMemberRestorationPorts;
}>): ProviderOwnerRuntime {
  const readMember = async (
    target: ProviderTarget,
    nativeIdentity: string,
    contentAuthority: ContentAuthority,
  ): Promise<DeploymentResult<NativeMemberObservation | null>> =>
    await memberPort(input.members, target.provider, contentAuthority).readMember(target, nativeIdentity);

  const readMarketplace: ProviderOwnerRuntime["readMarketplace"] = async (target, contentAuthority) =>
    await memberPort(input.members, target.provider, contentAuthority).readMarketplace(target);

  const restoreMarketplaceExact: ProviderOwnerRuntime["restoreMarketplaceExact"] = async ({
    target,
    contentAuthority,
    expected,
    prior,
    priorRegistration,
  }) => {
    const port = memberPort(input.members, target.provider, contentAuthority);
    const current = await port.readMarketplace(target);
    if (!current.ok) return current;
    if (sameMarketplace(current.value, prior)) return success(null);
    if (!sameMarketplace(current.value, expected)) {
      return marketplaceFailure("Live marketplace no longer matches the recorded provider post-state");
    }
    if (!registrationMatchesObservation(priorRegistration, prior)) {
      return marketplaceFailure("Prior marketplace registration does not bind its observation");
    }
    const source = priorRegistration === null
      ? success(null)
      : await materializeMarketplaceSource(input.projections, priorRegistration);
    if (!source.ok) return source;
    const restored = await port.setMarketplaceExact({
      target,
      expected,
      registration: priorRegistration,
      source: source.value,
    });
    if (!restored.ok) return restored;
    const verified = await port.readMarketplace(target);
    if (!verified.ok) return verified;
    return sameMarketplace(verified.value, prior)
      ? success(null)
      : marketplaceFailure("Provider inverse did not restore the exact prior marketplace");
  };

  const restoreMemberExact: ProviderOwnerRuntime["restoreMemberExact"] = async ({
    context,
    target,
    contentAuthority,
    expected,
    prior,
  }) => {
    const port = memberPort(input.members, target.provider, contentAuthority);
    const activeRegistration = context.activeMarketplace;
    const activeObservation = marketplaceObservation(activeRegistration);
    if (prior !== null && context.kind === "InstallMember") {
      return marketplaceFailure("Install inverse cannot carry a prior native member");
    }
    const priorRegistration = context.priorMarketplace;
    if (
      prior !== null
      && context.kind !== "InstallMember"
      && !marketplaceContainsPrior(priorRegistration, prior, context)
    ) {
      return marketplaceFailure("Provider member inverse prior marketplace is incomplete");
    }
    const priorObservation = prior === null
      ? activeObservation
      : marketplaceObservation(priorRegistration);

    const marketplace = await port.readMarketplace(target);
    if (!marketplace.ok) return marketplace;
    if (
      !sameMarketplace(marketplace.value, activeObservation)
      && !sameMarketplace(marketplace.value, priorObservation)
    ) {
      return marketplaceFailure("Live marketplace changed during provider member replay");
    }
    const current = await port.readMember(target, memberIdentity(expected, prior));
    if (!current.ok) return current;
    if (!sameMember(current.value, prior) && !sameMember(current.value, expected)) {
      return failure([issue(
        "MUTATION_FAILED",
        "owner.restore.member",
        "Live native member no longer matches the recorded provider post-state",
        memberLabel(expected),
        memberLabel(current.value),
      )]);
    }

    if (!sameMember(current.value, prior)) {
      if (priorRegistration !== null && !sameMarketplace(marketplace.value, priorObservation)) {
        const source = await materializeMarketplaceSource(input.projections, priorRegistration);
        if (!source.ok) return source;
        const changed = await port.setMarketplaceExact({
          target,
          expected: activeObservation,
          registration: priorRegistration,
          source: source.value,
        });
        if (!changed.ok) return changed;
      }
      const restored = await port.restoreExact({ target, expected, prior });
      if (!restored.ok) return restored;
    }

    const postMarketplace = await port.readMarketplace(target);
    if (!postMarketplace.ok) return postMarketplace;
    if (!sameMarketplace(postMarketplace.value, activeObservation)) {
      if (!sameMarketplace(postMarketplace.value, priorObservation)) {
        return marketplaceFailure("Provider marketplace changed before inverse normalization");
      }
      const activeSource = activeRegistration === null
        ? success(null)
        : await materializeMarketplaceSource(input.projections, activeRegistration);
      if (!activeSource.ok) return activeSource;
      const normalized = await port.setMarketplaceExact({
        target,
        expected: priorObservation,
        registration: activeRegistration,
        source: activeSource.value,
      });
      if (!normalized.ok) return normalized;
    }

    const verified = await port.readMember(target, memberIdentity(expected, prior));
    if (!verified.ok) return verified;
    return sameMember(verified.value, prior)
      ? success(null)
      : failure([issue(
          "MUTATION_FAILED",
          "owner.restore.member",
          "Provider inverse did not restore the exact prior native member",
          memberLabel(prior),
          memberLabel(verified.value),
        )]);
  };

  const removeIdentityExact: ProviderOwnerRuntime["removeIdentityExact"] = async ({ target, expected }) =>
    await input.targets.removeAdmittedIdentityExact(target, expected);
  const restoreReceiptExact: ProviderOwnerRuntime["restoreReceiptExact"] = async ({
    target,
    expected,
    prior,
  }) => await input.targets.restoreReceiptExact(target, expected, prior);

  return Object.freeze({
    readIdentity: input.targets.identities.read,
    removeIdentityExact,
    readMarketplace,
    restoreMarketplaceExact,
    readMember,
    restoreMemberExact,
    readReceipt: input.targets.receipts.read,
    restoreReceiptExact,
  });
}

function memberPort(
  ports: NativeMemberRestorationPorts,
  provider: ProviderId,
  contentAuthority: ContentAuthority,
): NativeMemberRestorationPort {
  return typeof ports === "function" ? ports(provider, contentAuthority) : ports[provider];
}

function marketplaceContainsPrior(
  registration: ProviderMarketplaceRegistration | null,
  prior: NativeMemberObservation,
  context: Extract<ProviderMemberRestoreContext, { kind: "EnableMember" | "RetireMember" }>,
): boolean {
  return registration !== null
    && registration.marketplaceIdentity === prior.providerSourceIdentity
    && registration.members.some((member) =>
      member.pluginId === prior.pluginId
      && member.nativeIdentity === prior.nativeIdentity
      && member.providerSourceIdentity === prior.providerSourceIdentity
      && member.sourceProjectionDigest === context.priorProjectionDigest
      && member.memberFingerprint === prior.memberFingerprint);
}

async function materializeMarketplaceSource(
  projections: PathlessProjectionStorage,
  registration: ProviderMarketplaceRegistration,
) {
  const materialized = await projections.marketplaceMaterializer.materialize(
    registration.provider,
    registration,
  );
  return materialized.ok
    ? success(Object.freeze({
        projectionDigest: materialized.value.projectionDigest,
        sourceDigest: materialized.value.sourceDigest,
      }))
    : materialized;
}

function marketplaceObservation(
  registration: ProviderMarketplaceRegistration | null,
): ProviderMarketplaceObservation {
  return registration === null
    ? Object.freeze({ kind: "absent" })
    : Object.freeze({ kind: "present", state: marketplaceState(registration) });
}

function registrationMatchesObservation(
  registration: ProviderMarketplaceRegistration | null,
  observation: ProviderMarketplaceObservation,
): boolean {
  return registration === null
    ? observation.kind === "absent"
    : observation.kind === "present"
      && sameMarketplaceState(marketplaceState(registration), observation.state);
}

function sameMarketplace(
  left: ProviderMarketplaceObservation,
  right: ProviderMarketplaceObservation,
): boolean {
  return left.kind === "absent"
    ? right.kind === "absent"
    : right.kind === "present" && sameMarketplaceState(left.state, right.state);
}

function marketplaceFailure(message: string): DeploymentResult<never> {
  return failure([issue("MUTATION_FAILED", "owner.restore.marketplace", message)]);
}

function memberIdentity(
  expected: NativeMemberObservation | null,
  prior: NativeMemberObservation | null,
): string {
  const identity = expected?.nativeIdentity ?? prior?.nativeIdentity;
  if (
    identity === undefined
    || (expected !== null && prior !== null && expected.nativeIdentity !== prior.nativeIdentity)
  ) {
    throw new Error("Provider inverse must bind exactly one native identity");
  }
  return identity;
}

function sameMember(
  left: NativeMemberObservation | null,
  right: NativeMemberObservation | null,
): boolean {
  if (left === null || right === null) return left === right;
  return left.pluginId === right.pluginId
    && left.nativeIdentity === right.nativeIdentity
    && left.artifactAuthority.protocol === right.artifactAuthority.protocol
    && left.artifactAuthority.contentAuthority === right.artifactAuthority.contentAuthority
    && left.artifactAuthority.sourceCommit === right.artifactAuthority.sourceCommit
    && left.providerSourceIdentity === right.providerSourceIdentity
    && left.memberFingerprint === right.memberFingerprint
    && left.enablement === right.enablement
    && sameStrings(left.visibleSkills, right.visibleSkills)
    && sameStrings(left.visibleHooks, right.visibleHooks);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function memberLabel(member: NativeMemberObservation | null): string {
  return member === null
    ? "absent"
    : `${member.nativeIdentity}:${member.memberFingerprint}:${member.enablement}`;
}
