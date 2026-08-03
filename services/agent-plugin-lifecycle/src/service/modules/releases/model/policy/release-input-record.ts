import {
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
} from "../../../../model/policy/release-input";
import { canonicalSerializeAgentPluginReleaseInput } from "../../../../model/policy/release-input-codec";
import type { ReleaseInputRecordRequest, ReleaseInputRecordResult } from "../dto/release-lifecycle";

type ReleaseInputRecordSuccess = Extract<ReleaseInputRecordResult, { ok: true }>;

/** In-process request shape after the caller admits the runtime byte carrier. */
export type ReleaseInputRecordPolicyInput =
  | Extract<ReleaseInputRecordRequest, { kind: "encode-body" }>
  | Readonly<{ kind: "validate-envelope"; bytes: Uint8Array }>;

/** In-process result shape after Releases constructs the canonical byte carrier. */
export type ReleaseInputRecordPolicyResult =
  | Readonly<{
      ok: true;
      value: Omit<ReleaseInputRecordSuccess["value"], "bytes"> & Readonly<{ bytes: Uint8Array }>;
    }>
  | Extract<ReleaseInputRecordResult, { ok: false }>;

/** Applies Releases-owned record admission and canonical byte construction. */
export function evaluateReleaseInputRecord(
  input: ReleaseInputRecordRequest
): ReleaseInputRecordPolicyResult {
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
}
