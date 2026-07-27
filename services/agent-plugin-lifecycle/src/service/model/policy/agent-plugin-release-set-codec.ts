import type { AgentPluginReleaseSet } from "../dto/agent-plugin-release-set";
import type { CanonicalJsonValue } from "../dto/canonical-json";
import { canonicalJsonLine } from "./canonical-json";
import { completenessWitnessValue } from "./completeness-witness";
import { ownershipIndexValue } from "./distribution-ownership";

type AgentPluginReleaseSetBodyCandidate = Omit<AgentPluginReleaseSet["body"], "members"> &
  Readonly<{
    members: readonly AgentPluginReleaseSet["body"]["members"][number][];
  }>;

/**
 * Projects the digest-free complete-set body into its canonical JSON value.
 *
 * This is the sole preimage for `ReleaseSetDigest`; member release digests
 * bind exact release identities without introducing a storage handle.
 */
function agentPluginReleaseSetBodyValue(
  body: AgentPluginReleaseSetBodyCandidate
): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    builderProtocolVersion: body.builderProtocolVersion,
    contentAuthority: body.contentAuthority,
    sourceRepository: body.sourceRepository,
    sourceCommit: body.sourceCommit,
    sourceTree: body.sourceTree,
    releaseInputDigest: body.releaseInputDigest,
    completenessWitness: completenessWitnessValue(body.completenessWitness),
    ownershipIndex: ownershipIndexValue(body.ownershipIndex),
    members: body.members.map((member) => ({
      pluginId: member.pluginId,
      releaseDigest: member.releaseDigest,
    })),
  };
}

/** Projects one admitted complete release set into its canonical envelope value. */
function agentPluginReleaseSetValue(releaseSet: AgentPluginReleaseSet): CanonicalJsonValue {
  return {
    schemaVersion: releaseSet.schemaVersion,
    releaseSetDigest: releaseSet.releaseSetDigest,
    body: agentPluginReleaseSetBodyValue(releaseSet.body),
  };
}

/** Serializes the exact digest-free body used to derive complete-set identity. */
export function canonicalSerializeAgentPluginReleaseSetBody(
  body: AgentPluginReleaseSetBodyCandidate
): Uint8Array {
  return canonicalJsonLine(agentPluginReleaseSetBodyValue(body));
}

/** Serializes one admitted complete release set into its unique canonical wire form. */
export function canonicalSerializeAgentPluginReleaseSet(
  releaseSet: AgentPluginReleaseSet
): Uint8Array {
  return canonicalJsonLine(agentPluginReleaseSetValue(releaseSet));
}
