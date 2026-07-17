import type { PluginId } from "../../../../shared/release";

import { canonicalDigest, compareCanonical, type CanonicalValue } from "./canonical";
import type {
  AdapterProtocol,
  ProviderMemberFingerprint,
  ProviderSourceDigest,
  ProviderSourceIdentity,
  ProjectionDigest,
} from "./projection";
import type { ProviderId } from "./target";

declare const marketplaceProjectionDigestBrand: unique symbol;

export type MarketplaceProjectionDigest = string & {
  readonly [marketplaceProjectionDigestBrand]: "MarketplaceProjectionDigest";
};

export interface ProviderMarketplaceMemberSource {
  readonly pluginId: PluginId;
  readonly nativeIdentity: string;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly sourceProjectionDigest: ProjectionDigest;
  readonly memberFingerprint: ProviderMemberFingerprint;
}

export interface ProviderMarketplaceState {
  readonly provider: ProviderId;
  readonly adapterProtocol: AdapterProtocol;
  readonly marketplaceIdentity: ProviderSourceIdentity;
  readonly projectionDigest: MarketplaceProjectionDigest;
  readonly sourceDigest: ProviderSourceDigest;
}

export interface ProviderMarketplaceRegistration extends ProviderMarketplaceState {
  readonly members: readonly ProviderMarketplaceMemberSource[];
}

export type ProviderMarketplaceObservation =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "present"; state: ProviderMarketplaceState }>;

export function createProviderMarketplaceRegistration(input: Readonly<{
  provider: ProviderId;
  adapterProtocol: AdapterProtocol;
  marketplaceIdentity: ProviderSourceIdentity;
  members: readonly ProviderMarketplaceMemberSource[];
}>): ProviderMarketplaceRegistration {
  if (input.members.length === 0) {
    throw new Error("Provider marketplace registration requires at least one managed member");
  }
  const members = [...input.members].sort(compareMarketplaceMembers);
  const pluginIds = new Set<string>();
  const nativeIdentities = new Set<string>();
  for (const member of members) {
    if (member.providerSourceIdentity !== input.marketplaceIdentity) {
      throw new Error("Provider marketplace members must share one marketplace identity");
    }
    if (pluginIds.has(member.pluginId) || nativeIdentities.has(member.nativeIdentity)) {
      throw new Error("Provider marketplace members must have unique plugin and native identities");
    }
    pluginIds.add(member.pluginId);
    nativeIdentities.add(member.nativeIdentity);
  }
  const frozenMembers = Object.freeze(members.map((member) => Object.freeze({ ...member })));
  const projectionDigest = canonicalDigest("mp1_", {
    protocol: "agent-provider-marketplace-projection@v1",
    provider: input.provider,
    adapterProtocol: input.adapterProtocol,
    marketplaceIdentity: input.marketplaceIdentity,
    members: frozenMembers.map(marketplaceMemberValue),
  }) as MarketplaceProjectionDigest;
  const sourceDigest = canonicalDigest("ps1_", {
    protocol: "agent-provider-marketplace-source@v1",
    provider: input.provider,
    marketplaceIdentity: input.marketplaceIdentity,
    members: frozenMembers.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      memberFingerprint: member.memberFingerprint,
    })),
  }) as ProviderSourceDigest;
  return Object.freeze({
    provider: input.provider,
    adapterProtocol: input.adapterProtocol,
    marketplaceIdentity: input.marketplaceIdentity,
    projectionDigest,
    sourceDigest,
    members: frozenMembers,
  });
}

export function marketplaceState(
  registration: ProviderMarketplaceRegistration,
): ProviderMarketplaceState {
  return Object.freeze({
    provider: registration.provider,
    adapterProtocol: registration.adapterProtocol,
    marketplaceIdentity: registration.marketplaceIdentity,
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
  });
}

export function marketplaceStateValue(state: ProviderMarketplaceState): CanonicalValue {
  return {
    provider: state.provider,
    adapterProtocol: state.adapterProtocol,
    marketplaceIdentity: state.marketplaceIdentity,
    projectionDigest: state.projectionDigest,
    sourceDigest: state.sourceDigest,
  };
}

export function marketplaceObservationValue(
  observation: ProviderMarketplaceObservation,
): CanonicalValue {
  return observation.kind === "absent"
    ? { kind: observation.kind }
    : { kind: observation.kind, state: marketplaceStateValue(observation.state) };
}

export function sameMarketplaceState(
  left: ProviderMarketplaceState,
  right: ProviderMarketplaceState,
): boolean {
  return left.provider === right.provider
    && left.adapterProtocol === right.adapterProtocol
    && left.marketplaceIdentity === right.marketplaceIdentity
    && left.projectionDigest === right.projectionDigest
    && left.sourceDigest === right.sourceDigest;
}

function marketplaceMemberValue(member: ProviderMarketplaceMemberSource): CanonicalValue {
  return {
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    providerSourceIdentity: member.providerSourceIdentity,
    sourceProjectionDigest: member.sourceProjectionDigest,
    memberFingerprint: member.memberFingerprint,
  };
}

function compareMarketplaceMembers(
  left: ProviderMarketplaceMemberSource,
  right: ProviderMarketplaceMemberSource,
): number {
  return compareCanonical(left.pluginId, right.pluginId)
    || compareCanonical(left.nativeIdentity, right.nativeIdentity);
}
