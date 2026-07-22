import { ReadonlyObject, Type, type Static } from "typebox";
import { Value } from "typebox/value";

import {
  canonicalJsonLine,
  decodeCanonicalJson,
  equalBytes,
  type CanonicalJsonValue,
} from "./canonical";
import { issue, type ReleaseIssue } from "./issues";
import { type ArtifactDigest, type ReleaseDigest, type ReleaseSetDigest } from "./primitives";
import { failure, success, type ReleaseResult } from "./result";

declare const releaseArtifactRefBrand: unique symbol;
declare const completeSetArtifactRefBrand: unique symbol;

const MAX_ARTIFACT_REF_BYTES = 512;

const ReleaseDigestInputSchema = Type.String({
  pattern: "^rd1_[0-9a-f]{64}$",
});
const ArtifactDigestInputSchema = Type.String({
  pattern: "^ad1_[0-9a-f]{64}$",
});
const ReleaseSetDigestInputSchema = Type.String({
  pattern: "^rs1_[0-9a-f]{64}$",
});

export const ReleaseArtifactRefInputSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("release"),
    releaseDigest: ReleaseDigestInputSchema,
    artifactDigest: ArtifactDigestInputSchema,
  }),
  { additionalProperties: false }
);

export const CompleteSetArtifactRefInputSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("complete-set"),
    releaseSetDigest: ReleaseSetDigestInputSchema,
  }),
  { additionalProperties: false }
);

export const ArtifactRefInputSchema = Type.Union([
  ReleaseArtifactRefInputSchema,
  CompleteSetArtifactRefInputSchema,
]);

export type ReleaseArtifactRefInput = Static<typeof ReleaseArtifactRefInputSchema>;
export type CompleteSetArtifactRefInput = Static<typeof CompleteSetArtifactRefInputSchema>;
export type ArtifactRefInput = Static<typeof ArtifactRefInputSchema>;

export type ReleaseArtifactRef = Readonly<{
  kind: "release";
  releaseDigest: ReleaseDigest;
  artifactDigest: ArtifactDigest;
  [releaseArtifactRefBrand]: "ReleaseArtifactRef";
}>;

export type CompleteSetArtifactRef = Readonly<{
  kind: "complete-set";
  releaseSetDigest: ReleaseSetDigest;
  [completeSetArtifactRefBrand]: "CompleteSetArtifactRef";
}>;

export type ArtifactRef = ReleaseArtifactRef | CompleteSetArtifactRef;

export const ReleaseArtifactRefSchema = Type.Unsafe<ReleaseArtifactRef>(
  ReleaseArtifactRefInputSchema
);

export const CompleteSetArtifactRefSchema = Type.Unsafe<CompleteSetArtifactRef>(
  CompleteSetArtifactRefInputSchema
);

export const ArtifactRefSchema = Type.Union([
  ReleaseArtifactRefSchema,
  CompleteSetArtifactRefSchema,
]);

export function createReleaseArtifactRef(
  releaseDigest: ReleaseDigest,
  artifactDigest: ArtifactDigest
): ReleaseArtifactRef {
  return Object.freeze({ kind: "release", releaseDigest, artifactDigest }) as ReleaseArtifactRef;
}

export function createCompleteSetArtifactRef(
  releaseSetDigest: ReleaseSetDigest
): CompleteSetArtifactRef {
  return Object.freeze({ kind: "complete-set", releaseSetDigest }) as CompleteSetArtifactRef;
}

export function normalizeArtifactRef(input: ReleaseArtifactRefInput): ReleaseArtifactRef;
export function normalizeArtifactRef(input: CompleteSetArtifactRefInput): CompleteSetArtifactRef;
export function normalizeArtifactRef(input: ArtifactRefInput): ArtifactRef;
export function normalizeArtifactRef(input: ArtifactRefInput): ArtifactRef {
  return input.kind === "release"
    ? createReleaseArtifactRef(
        input.releaseDigest as ReleaseDigest,
        input.artifactDigest as ArtifactDigest
      )
    : createCompleteSetArtifactRef(input.releaseSetDigest as ReleaseSetDigest);
}

export function parseArtifactRef(input: unknown): ReleaseResult<ArtifactRef, ReleaseIssue> {
  if (!Value.Check(ArtifactRefInputSchema, input)) {
    return failure([
      issue(
        "INVALID_ARTIFACT_REF",
        "artifactRef",
        "Artifact reference must match the closed artifact-ref schema"
      ),
    ]);
  }
  return success(normalizeArtifactRef(input));
}

export function decodeArtifactRef(bytes: unknown): ReleaseResult<ArtifactRef, ReleaseIssue> {
  const decoded = decodeCanonicalJson(bytes, "artifactRef", MAX_ARTIFACT_REF_BYTES);
  if (!decoded.ok) return decoded;
  const parsed = parseArtifactRef(decoded.value);
  if (!parsed.ok) return parsed;
  if (
    !(bytes instanceof Uint8Array) ||
    !equalBytes(bytes, canonicalSerializeArtifactRef(parsed.value))
  ) {
    return failure([
      issue(
        "NON_CANONICAL_ENVELOPE",
        "artifactRef",
        "Artifact-ref bytes are not the unique canonical representation"
      ),
    ]);
  }
  return parsed;
}

export function canonicalSerializeArtifactRef(ref: ArtifactRef): Uint8Array {
  return canonicalJsonLine(artifactRefValue(ref));
}

export function artifactRefValue(ref: ArtifactRef): CanonicalJsonValue {
  return ref.kind === "release"
    ? { kind: ref.kind, releaseDigest: ref.releaseDigest, artifactDigest: ref.artifactDigest }
    : { kind: ref.kind, releaseSetDigest: ref.releaseSetDigest };
}
