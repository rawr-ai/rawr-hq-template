import type { AgentPluginPayload } from "../dto/agent-plugin-payload";

/**
 * Caps aggregate decoded bytes for every release-set admission and resource read.
 *
 * One service-wide value keeps Releases, Packaging, and Providers aligned
 * without module-local aliases or duplicate limit policy.
 */
export const MAX_RELEASE_SET_PAYLOAD_BYTES = 64 * 1024 * 1024;

/** Result of adding decoded payload bytes to a release-set aggregate. */
export type PayloadByteTotal = Readonly<{ ok: true; value: number }> | Readonly<{ ok: false }>;

/**
 * Adds decoded payload bytes while rejecting invalid, unsafe, or overbound totals.
 *
 * This policy gives every lifecycle module the same aggregate release-set bound
 * without transferring payload or release ownership into the service model.
 */
export function addReleaseSetPayloadBytes(current: number, additional: number): PayloadByteTotal {
  if (
    !Number.isSafeInteger(current) ||
    current < 0 ||
    !Number.isSafeInteger(additional) ||
    additional < 0
  ) {
    return { ok: false };
  }
  const value = current + additional;
  return Number.isSafeInteger(value) && value <= MAX_RELEASE_SET_PAYLOAD_BYTES
    ? { ok: true, value }
    : { ok: false };
}

/** Totals the decoded bytes represented by one complete collection of member payloads. */
export function totalReleaseSetPayloadBytes(
  members: readonly Readonly<{ payload: AgentPluginPayload }>[]
): PayloadByteTotal {
  let total = 0;
  for (const member of members) {
    for (const entry of member.payload.manifest) {
      const next = addReleaseSetPayloadBytes(total, entry.byteLength);
      if (!next.ok) return next;
      total = next.value;
    }
  }
  return { ok: true, value: total };
}
