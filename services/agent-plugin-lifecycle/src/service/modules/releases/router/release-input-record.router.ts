import {
  canonicalSerializeAgentPluginReleaseInput,
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
} from "../../../shared/release";
import { module } from "../module";

export const releaseInputRecord = module.releaseInputRecord.handler(async ({ input }) => {
  const result = input.kind === "encode-body"
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
