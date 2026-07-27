import type { AgentPluginRelease, AgentPluginReleaseBody } from "../dto/agent-plugin-release";
import type { CanonicalJsonValue } from "../dto/canonical-json";
import { payloadValue } from "./agent-plugin-payload-codec";
import { canonicalJsonLine } from "./canonical-json";
import { payloadManifestValue } from "./payload-manifest";
import { provenanceBindingValue } from "./provenance-binding";

/**
 * Projects the digest-free release body into its canonical JSON value.
 *
 * This is the sole preimage for `ReleaseDigest`; the in-memory payload is
 * bound through its manifest and payload digest rather than a storage handle.
 */
function agentPluginReleaseBodyValue(body: AgentPluginReleaseBody): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    builderProtocolVersion: body.builderProtocolVersion,
    contentAuthority: body.contentAuthority,
    sourceRepository: body.sourceRepository,
    sourceCommit: body.sourceCommit,
    sourceTree: body.sourceTree,
    releaseInputDigest: body.releaseInputDigest,
    pluginId: body.pluginId,
    aliases: body.aliases,
    payloadManifest: payloadManifestValue(body.payloadManifest),
    payloadDigest: body.payloadDigest,
    vendor: body.vendor.map(provenanceBindingValue),
    curation: body.curation.map(provenanceBindingValue),
  };
}

/** Serializes the exact digest-free body used to derive release identity. */
export function canonicalSerializeAgentPluginReleaseBody(body: AgentPluginReleaseBody): Uint8Array {
  return canonicalJsonLine(agentPluginReleaseBodyValue(body));
}

/** Projects one admitted in-memory release into its canonical wire envelope. */
export function agentPluginReleaseValue(release: AgentPluginRelease): CanonicalJsonValue {
  return {
    schemaVersion: release.schemaVersion,
    releaseDigest: release.releaseDigest,
    body: agentPluginReleaseBodyValue(release.body),
    payload: payloadValue(release.payload),
  };
}

/** Serializes one admitted release into its unique canonical wire form. */
export function canonicalSerializeAgentPluginRelease(release: AgentPluginRelease): Uint8Array {
  return canonicalJsonLine(agentPluginReleaseValue(release));
}
