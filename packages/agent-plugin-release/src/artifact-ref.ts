import {
  canonicalJsonLine,
  decodeCanonicalJson,
  equalBytes,
  type CanonicalJsonValue,
} from "./canonical";
import { issue, type ReleaseIssue } from "./issues";
import { collect, isExactRecord } from "./parse";
import {
  parseArtifactDigest,
  parseReleaseDigest,
  parseReleaseSetDigest,
  type ArtifactDigest,
  type ReleaseDigest,
  type ReleaseSetDigest,
} from "./primitives";
import { asNonEmpty, failure, success, type ReleaseResult } from "./result";

declare const releaseArtifactRefBrand: unique symbol;
declare const completeSetArtifactRefBrand: unique symbol;

const MAX_ARTIFACT_REF_BYTES = 512;

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

export function createReleaseArtifactRef(
  releaseDigest: ReleaseDigest,
  artifactDigest: ArtifactDigest,
): ReleaseArtifactRef {
  return Object.freeze({ kind: "release", releaseDigest, artifactDigest }) as ReleaseArtifactRef;
}

export function createCompleteSetArtifactRef(
  releaseSetDigest: ReleaseSetDigest,
): CompleteSetArtifactRef {
  return Object.freeze({ kind: "complete-set", releaseSetDigest }) as CompleteSetArtifactRef;
}

export function parseArtifactRef(input: unknown): ReleaseResult<ArtifactRef, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return failure([issue("INVALID_ARTIFACT_REF", "artifactRef", "Artifact reference must be a closed object")]);
  }
  const kind = (input as Record<string, unknown>).kind;
  if (kind === "release") {
    if (!isExactRecord(input, ["artifactDigest", "kind", "releaseDigest"], "artifactRef", issues)) {
      return failure([issues[0] ?? issue("INVALID_ARTIFACT_REF", "artifactRef", "Invalid release artifact reference")]);
    }
    const rd = collect(parseReleaseDigest(input.releaseDigest, "artifactRef.releaseDigest"), issues);
    const ad = collect(parseArtifactDigest(input.artifactDigest, "artifactRef.artifactDigest"), issues);
    const nonEmpty = asNonEmpty(issues);
    if (nonEmpty !== undefined) return failure(nonEmpty);
    if (rd === undefined || ad === undefined) {
      return failure([issue("INVALID_ARTIFACT_REF", "artifactRef", "Invalid release artifact reference")]);
    }
    return success(createReleaseArtifactRef(rd, ad));
  }
  if (kind === "complete-set") {
    if (!isExactRecord(input, ["kind", "releaseSetDigest"], "artifactRef", issues)) {
      return failure([issues[0] ?? issue("INVALID_ARTIFACT_REF", "artifactRef", "Invalid complete-set artifact reference")]);
    }
    const rs = collect(parseReleaseSetDigest(input.releaseSetDigest, "artifactRef.releaseSetDigest"), issues);
    const nonEmpty = asNonEmpty(issues);
    if (nonEmpty !== undefined) return failure(nonEmpty);
    if (rs === undefined) {
      return failure([issue("INVALID_ARTIFACT_REF", "artifactRef", "Invalid complete-set artifact reference")]);
    }
    return success(createCompleteSetArtifactRef(rs));
  }
  return failure([issue("INVALID_ARTIFACT_REF", "artifactRef.kind", "Artifact reference kind must be release or complete-set")]);
}

export function decodeArtifactRef(bytes: unknown): ReleaseResult<ArtifactRef, ReleaseIssue> {
  const decoded = decodeCanonicalJson(bytes, "artifactRef", MAX_ARTIFACT_REF_BYTES);
  if (!decoded.ok) return decoded;
  const parsed = parseArtifactRef(decoded.value);
  if (!parsed.ok) return parsed;
  if (!(bytes instanceof Uint8Array) || !equalBytes(bytes, canonicalSerializeArtifactRef(parsed.value))) {
    return failure([issue("NON_CANONICAL_ENVELOPE", "artifactRef", "Artifact-ref bytes are not the unique canonical representation")]);
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
