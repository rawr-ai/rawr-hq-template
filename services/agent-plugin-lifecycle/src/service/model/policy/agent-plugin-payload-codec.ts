import type { AgentPluginPayload, PayloadEntry } from "../dto/agent-plugin-payload";
import type { CanonicalJsonValue } from "../dto/canonical-json";
import { canonicalJsonLine } from "./canonical-json";
import { payloadManifestValue } from "./payload-manifest";

/** Projects canonical payload entries into the digest-bearing JSON value. */
function payloadEntriesValue(entries: readonly PayloadEntry[]): CanonicalJsonValue {
  return entries.map((entry) => ({
    path: entry.path,
    mode: entry.mode,
    bytesBase64: entry.bytesBase64,
  }));
}

/** Projects a verified agent-plugin payload without exposing its private brand. */
export function payloadValue(payload: AgentPluginPayload): CanonicalJsonValue {
  return {
    protocolVersion: payload.protocolVersion,
    manifest: payloadManifestValue(payload.manifest),
    entries: payloadEntriesValue(payload.entries),
    payloadDigest: payload.payloadDigest,
  };
}

/** Serializes payload entries in canonical property order with one trailing LF. */
export function canonicalSerializePayloadEntries(entries: readonly PayloadEntry[]): Uint8Array {
  return canonicalJsonLine(payloadEntriesValue(entries));
}

/** Serializes one verified payload in canonical property order with one trailing LF. */
export function canonicalSerializeAgentPluginPayload(payload: AgentPluginPayload): Uint8Array {
  return canonicalJsonLine(payloadValue(payload));
}
