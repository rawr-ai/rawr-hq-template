import type { CanonicalJsonValue } from "../dto/canonical-json";
import type {
  AgentPluginReleaseInput,
  ReleaseInputBody,
  ReleaseMemberDeclaration,
} from "../dto/release-input";
import { canonicalJsonLine } from "./canonical-json";
import { ownershipClaimValue } from "./distribution-ownership";
import { payloadManifestValue } from "./payload-manifest";
import { provenanceBindingValue } from "./provenance-binding";

/**
 * Serializes the identity-bearing body used to derive a release-input digest.
 *
 * Construction and verification share this exact codec so the digest preimage
 * cannot diverge from the body published in the release-input envelope.
 */
export function canonicalSerializeReleaseInputBody(body: ReleaseInputBody): Uint8Array {
  return canonicalJsonLine(releaseInputBodyValue(body));
}

/**
 * Serializes one admitted release input into its unique canonical wire form.
 *
 * The envelope projection deliberately excludes derived ownership and
 * completeness values because they are reconstructed from the reviewed body.
 */
export function canonicalSerializeAgentPluginReleaseInput(
  input: AgentPluginReleaseInput
): Uint8Array {
  return canonicalJsonLine(releaseInputValue(input));
}

/**
 * Projects an admitted release input into its persisted envelope value.
 *
 * Individual-release and complete-set verification reuse this projection when
 * they re-admit an embedded input instead of defining another envelope shape.
 */
export function releaseInputValue(input: AgentPluginReleaseInput): CanonicalJsonValue {
  return {
    schemaVersion: input.schemaVersion,
    releaseInputDigest: input.releaseInputDigest,
    body: releaseInputBodyValue(input.body),
  };
}

function releaseInputBodyValue(body: ReleaseInputBody): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    contentAuthority: body.contentAuthority,
    members: body.members.map(releaseMemberValue),
    ownershipClaims: body.ownershipClaims.map(ownershipClaimValue),
    locks: body.locks.map(provenanceBindingValue),
    qualityPolicies: body.qualityPolicies.map(provenanceBindingValue),
  };
}

function releaseMemberValue(member: ReleaseMemberDeclaration): CanonicalJsonValue {
  return {
    kind: member.kind,
    pluginId: member.pluginId,
    skillInventory: member.skillInventory.map((entry) => ({
      identity: entry.identity,
      manifestPath: entry.manifestPath,
    })),
    payload: {
      protocolVersion: member.payload.protocolVersion,
      manifest: payloadManifestValue(member.payload.manifest),
      payloadDigest: member.payload.payloadDigest,
    },
    vendor: member.vendor.map(provenanceBindingValue),
    curation: member.curation.map(provenanceBindingValue),
  };
}
