import { createHash } from "node:crypto";
import { ReadonlyObject, type Static, Type } from "typebox";
import { Value } from "typebox/value";

export const MECHANICAL_EVIDENCE_PROTOCOL_VERSION = 1 as const;
export const MAX_MECHANICAL_EVIDENCE_BYTES = 64 * 1024 * 1024;

declare const mechanicalEvidenceDigestBrand: unique symbol;
export type MechanicalEvidenceDigest = string & {
  readonly [mechanicalEvidenceDigestBrand]: "MechanicalEvidenceDigestV1";
};

export interface MechanicalEvidenceHandleV1 {
  readonly kind: "mechanical-evidence";
  readonly protocolVersion: typeof MECHANICAL_EVIDENCE_PROTOCOL_VERSION;
  readonly digest: MechanicalEvidenceDigest;
}

export const MechanicalEvidenceHandleInputSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("mechanical-evidence"),
    protocolVersion: Type.Literal(MECHANICAL_EVIDENCE_PROTOCOL_VERSION),
    digest: Type.String({ pattern: "^me1_[0-9a-f]{64}$" }),
  }),
  { additionalProperties: false }
);

export const MechanicalEvidenceHandleSchema = Type.Unsafe<MechanicalEvidenceHandleV1>(
  MechanicalEvidenceHandleInputSchema
);

export type MechanicalEvidenceHandleInput = Static<typeof MechanicalEvidenceHandleInputSchema>;

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
    }>
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

export function normalizeMechanicalEvidenceHandle(
  input: MechanicalEvidenceHandleInput
): MechanicalEvidenceHandleV1 {
  return Object.freeze({
    kind: input.kind,
    protocolVersion: input.protocolVersion,
    digest: input.digest as MechanicalEvidenceDigest,
  });
}

export function parseMechanicalEvidenceHandle(
  input: unknown
):
  | Readonly<{ ok: true; value: MechanicalEvidenceHandleV1 }>
  | Readonly<{ ok: false; issue: MechanicalEvidenceIssue }> {
  if (!Value.Check(MechanicalEvidenceHandleInputSchema, input)) {
    return invalidHandle(
      "Mechanical evidence handle must be a closed object matching its protocol schema"
    );
  }
  return {
    ok: true,
    value: normalizeMechanicalEvidenceHandle(input),
  };
}

function invalidHandle(detail: string): Readonly<{ ok: false; issue: MechanicalEvidenceIssue }> {
  return { ok: false, issue: Object.freeze({ code: "InvalidHandle", detail }) };
}
