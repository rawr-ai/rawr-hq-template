import { createHash } from "node:crypto";

import { Value } from "typebox/value";

import {
  canonicalJsonLine,
  decodeCanonicalJson,
  equalBytes,
  type CanonicalJsonValue,
} from "../../../../shared/release/canonical";
import {
  CURRENT_MAIN_V2_PROTOCOL,
  CURRENT_MAIN_V2_SCHEMA_VERSION,
  CurrentMainBodyV2Schema,
  CurrentMainEnvelopeV2Schema,
  MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES,
  type CanonicalCurrentMainV2,
  type CurrentMainBodyV2,
  type CurrentMainEnvelopeV2,
  type CurrentMainProjectionTupleV2,
  type CurrentMainV2CodecFailureCode,
  type CurrentMainV2CodecResult,
} from "../dto/current-main";
import {
  isCanonicalId,
  isCanonicalRepositoryIdentity,
} from "../../../../model/dto/structural";

export function encodeCurrentMainBodyV2(
  input: unknown,
): CurrentMainV2CodecResult {
  const body = normalizeBody(input);
  if (body === undefined) {
    return failed("InvalidSchema", "currentMain.body", "Current-main body does not match its closed schema");
  }
  return encodeBody(body);
}

export function validateCurrentMainEnvelopeV2(
  bytes: unknown,
): CurrentMainV2CodecResult {
  const decoded = decodeCanonicalJson(bytes, "currentMain", MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES);
  if (!decoded.ok) {
    const tooLarge = decoded.issues.some((entry) => entry.code === "ENVELOPE_TOO_LARGE");
    return failed(
      tooLarge ? "EnvelopeTooLarge" : "InvalidSchema",
      "currentMain",
      tooLarge
        ? "Current-main envelope exceeds 2,097,152 bytes"
        : "Current-main envelope is not valid UTF-8 JSON",
    );
  }
  if (!Value.Check(CurrentMainEnvelopeV2Schema, decoded.value)) {
    return failed("InvalidSchema", "currentMain", "Current-main envelope does not match its closed schema");
  }
  const body = normalizeBody(decoded.value.body);
  if (body === undefined) {
    return failed("InvalidSchema", "currentMain.body", "Current-main body violates its domain contract");
  }
  const canonical = encodeBody(body);
  if (!canonical.ok) return canonical;
  if (decoded.value.currentMainDigest !== canonical.value.currentMainDigest) {
    return failed(
      "DigestMismatch",
      "currentMain.currentMainDigest",
      "Current-main digest does not match the canonical body bytes",
    );
  }
  if (!(bytes instanceof Uint8Array) || !equalBytes(bytes, canonical.value.bytes)) {
    return failed(
      "NonCanonical",
      "currentMain",
      "Current-main bytes are not the unique newline-terminated canonical representation",
    );
  }
  return canonical;
}

export function canonicalSerializeCurrentMainBodyV2(body: CurrentMainBodyV2): Uint8Array {
  return canonicalJsonLine(currentMainBodyValue(body));
}

export function canonicalSerializeCurrentMainEnvelopeV2(envelope: CurrentMainEnvelopeV2): Uint8Array {
  return canonicalJsonLine({
    schemaVersion: envelope.schemaVersion,
    currentMainDigest: envelope.currentMainDigest,
    body: currentMainBodyValue(envelope.body),
  });
}

function encodeBody(body: CurrentMainBodyV2): CurrentMainV2CodecResult {
  const currentMainDigest = digestBody(canonicalSerializeCurrentMainBodyV2(body));
  const record = Object.freeze({
    schemaVersion: CURRENT_MAIN_V2_SCHEMA_VERSION,
    currentMainDigest,
    body,
  }) satisfies CurrentMainEnvelopeV2;
  const bytes = canonicalSerializeCurrentMainEnvelopeV2(record);
  if (bytes.byteLength > MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES) {
    return failed(
      "EnvelopeTooLarge",
      "currentMain",
      "Current-main envelope exceeds 2,097,152 bytes",
    );
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      protocol: CURRENT_MAIN_V2_PROTOCOL,
      currentMainDigest,
      byteLength: bytes.byteLength,
      bytes: new Uint8Array(bytes),
      record,
    }),
  });
}

function normalizeBody(input: unknown): CurrentMainBodyV2 | undefined {
  if (!Value.Check(CurrentMainBodyV2Schema, input)) return undefined;
  if (
    !isCanonicalId(input.contentAuthority)
    || !isCanonicalRepositoryIdentity(input.sourceRepositoryIdentity)
    || !isCanonicalId(input.evaluationProfile)
    || input.projections.some((projection) => {
      return !isCanonicalId(projection.rendererProtocol)
        || !isCanonicalId(projection.adapterProtocol);
    })
  ) return undefined;
  return Object.freeze({
    schemaVersion: input.schemaVersion,
    channel: input.channel,
    contentAuthority: input.contentAuthority,
    sourceRepositoryIdentity: input.sourceRepositoryIdentity,
    sourceCommit: input.sourceCommit,
    sourceTree: input.sourceTree,
    releaseInputDigest: input.releaseInputDigest,
    releaseSetDigest: input.releaseSetDigest,
    evaluationProfile: input.evaluationProfile,
    projections: freezeProjections(input.projections),
  });
}

function freezeProjections(
  projections: CurrentMainProjectionTupleV2,
): CurrentMainProjectionTupleV2 {
  return Object.freeze([
    Object.freeze({ ...projections[0] }),
    Object.freeze({ ...projections[1] }),
  ]);
}

function currentMainBodyValue(body: CurrentMainBodyV2): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    channel: body.channel,
    contentAuthority: body.contentAuthority,
    sourceRepositoryIdentity: body.sourceRepositoryIdentity,
    sourceCommit: body.sourceCommit,
    sourceTree: body.sourceTree,
    releaseInputDigest: body.releaseInputDigest,
    releaseSetDigest: body.releaseSetDigest,
    evaluationProfile: body.evaluationProfile,
    projections: body.projections.map((projection) => ({
      provider: projection.provider,
      projectionDigest: projection.projectionDigest,
      rendererProtocol: projection.rendererProtocol,
      adapterProtocol: projection.adapterProtocol,
      capabilityProfileDigest: projection.capabilityProfileDigest,
    })),
  };
}

function digestBody(bytes: Uint8Array): `cm2_${string}` {
  return `cm2_${createHash("sha256").update(bytes).digest("hex")}`;
}

function failed(
  code: CurrentMainV2CodecFailureCode,
  path: string,
  message: string,
): Extract<CurrentMainV2CodecResult, { readonly ok: false }> {
  return Object.freeze({
    ok: false,
    failure: Object.freeze({ code, path, message }),
  });
}
