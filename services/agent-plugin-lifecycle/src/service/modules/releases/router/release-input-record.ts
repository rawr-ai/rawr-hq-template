import {
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
} from "#agent-plugin-lifecycle-service/model/policy/release-input";
import { canonicalSerializeAgentPluginReleaseInput } from "#agent-plugin-lifecycle-service/model/policy/release-input-codec";
import { module } from "../module";

/** Encodes or validates the canonical release-input record without acquiring resources. */
export const releaseInputRecord = module.releaseInputRecord.effect(function* ({ input }) {
  const result =
    input.kind === "encode-body"
      ? createAgentPluginReleaseInput(input.body)
      : decodeAgentPluginReleaseInput(input.bytes);
  if (!result.ok) return Object.freeze({ ok: false as const, issues: result.issues });

  const bytes = canonicalSerializeAgentPluginReleaseInput(result.value);
  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      releaseInputDigest: result.value.releaseInputDigest,
      byteLength: bytes.byteLength,
      bytes,
    }),
  });
});
