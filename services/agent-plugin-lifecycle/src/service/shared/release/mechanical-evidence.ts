import { createHash } from "node:crypto";

export const MECHANICAL_EVIDENCE_PROTOCOL_VERSION = 1 as const;
export const MAX_MECHANICAL_EVIDENCE_BYTES = 64 * 1024 * 1024;

const DIGEST_PATTERN = /^me1_[0-9a-f]{64}$/u;

declare const mechanicalEvidenceDigestBrand: unique symbol;
export type MechanicalEvidenceDigest = string & {
  readonly [mechanicalEvidenceDigestBrand]: "MechanicalEvidenceDigestV1";
};

export interface MechanicalEvidenceHandleV1 {
  readonly kind: "mechanical-evidence";
  readonly protocolVersion: typeof MECHANICAL_EVIDENCE_PROTOCOL_VERSION;
  readonly digest: MechanicalEvidenceDigest;
}

export interface MechanicalEvidenceIssue {
  readonly code:
    | "InvalidHandle"
    | "InvalidStoreRoot"
    | "MissingEntry"
    | "UnexpectedEntry"
    | "InvalidEntryType"
    | "ModeMismatch"
    | "DigestMismatch"
    | "EvidenceTooLarge"
    | "ReadFailure";
  readonly detail: string;
}

export type MechanicalEvidenceReadResult =
  | Readonly<{
    kind: "Verified";
    handle: MechanicalEvidenceHandleV1;
    bytes: Uint8Array;
  }>
  | Readonly<{ kind: "Missing"; handle: MechanicalEvidenceHandleV1 }>
  | Readonly<{
    kind: "Mismatch";
    handle: MechanicalEvidenceHandleV1;
    issues: readonly [MechanicalEvidenceIssue, ...MechanicalEvidenceIssue[]];
  }>;

export interface MechanicalEvidenceReader {
  read(handle: MechanicalEvidenceHandleV1): Promise<MechanicalEvidenceReadResult>;
}

export type MechanicalEvidencePublicationResult =
  | Readonly<{ kind: "Published"; handle: MechanicalEvidenceHandleV1 }>
  | Readonly<{ kind: "ReadOnlyConverged"; handle: MechanicalEvidenceHandleV1 }>
  | Readonly<{
    kind: "Rejected";
    handle: MechanicalEvidenceHandleV1;
    failure: string;
    cleanupFailure?: string;
  }>
  | Readonly<{
    kind: "Unsettled";
    handle: MechanicalEvidenceHandleV1;
    failure: string;
    observation: "Verified" | "Missing" | "Mismatch" | "Unknown";
    cleanupFailure?: string;
  }>;

export type MechanicalEvidenceStoreFailpointEvent =
  | Readonly<{ kind: "AfterStagingWrite" }>
  | Readonly<{ kind: "BeforeNoReplacePublication" }>
  | Readonly<{ kind: "AfterNoReplacePublication" }>
  | Readonly<{ kind: "AfterFinalVerification" }>;

export interface MechanicalEvidenceStore extends MechanicalEvidenceReader {
  publish(
    handle: MechanicalEvidenceHandleV1,
    bytes: Uint8Array,
    options?: Readonly<{
      failpoint?: (event: MechanicalEvidenceStoreFailpointEvent) => void | Promise<void>;
    }>,
  ): Promise<MechanicalEvidencePublicationResult>;
}

export function mechanicalEvidenceDigest(bytes: Uint8Array): MechanicalEvidenceDigest {
  const hash = createHash("sha256").update(bytes).digest("hex");
  return `me1_${hash}` as MechanicalEvidenceDigest;
}

export function createMechanicalEvidenceHandle(bytes: Uint8Array): MechanicalEvidenceHandleV1 {
  return Object.freeze({
    kind: "mechanical-evidence",
    protocolVersion: MECHANICAL_EVIDENCE_PROTOCOL_VERSION,
    digest: mechanicalEvidenceDigest(bytes),
  });
}

export function parseMechanicalEvidenceHandle(input: unknown):
  | Readonly<{ ok: true; value: MechanicalEvidenceHandleV1 }>
  | Readonly<{ ok: false; issue: MechanicalEvidenceIssue }> {
  if (!isExactRecord(input, ["digest", "kind", "protocolVersion"])) {
    return invalidHandle("Mechanical evidence handle must be a closed object");
  }
  if (
    input.kind !== "mechanical-evidence"
    || input.protocolVersion !== MECHANICAL_EVIDENCE_PROTOCOL_VERSION
    || typeof input.digest !== "string"
    || !DIGEST_PATTERN.test(input.digest)
  ) {
    return invalidHandle("Mechanical evidence handle has an invalid protocol or digest");
  }
  return {
    ok: true,
    value: Object.freeze({
      kind: "mechanical-evidence",
      protocolVersion: MECHANICAL_EVIDENCE_PROTOCOL_VERSION,
      digest: input.digest as MechanicalEvidenceDigest,
    }),
  };
}

function invalidHandle(detail: string): Readonly<{ ok: false; issue: MechanicalEvidenceIssue }> {
  return { ok: false, issue: Object.freeze({ code: "InvalidHandle", detail }) };
}

function isExactRecord(input: unknown, keys: readonly string[]): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const actual = Object.keys(input).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
