import { type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

import {
  canonicalJsonLine,
  decodeCanonicalJson,
  equalBytes,
  type CanonicalJsonValue,
} from "../../../../shared/release/canonical";
import { contentDigest } from "../../../../shared/release/primitives";
import {
  VendorLockRecordSchema,
  VendorProvenanceRecordSchema,
  VendorSourceDeclarationSchema,
  type VendorLockRecord,
  type VendorProvenanceRecord,
  type VendorSourceDeclaration,
  type VendorSourceIdentity,
} from "../dto/vendor-records";

const MAX_VENDOR_RECORD_BYTES = 1024 * 1024;

export interface VendorRecordDecodeFailure {
  readonly kind: "Invalid" | "NonCanonical";
  readonly detail: string;
}

export type VendorRecordDecodeResult<T> =
  | Readonly<{
    ok: true;
    value: T;
    exactBytes: Uint8Array;
    contentDigest: string;
  }>
  | Readonly<{ ok: false; failure: VendorRecordDecodeFailure }>;

export interface VendorPayloadDigestEntry {
  readonly path: string;
  readonly mode: "100644" | "100755";
  readonly blob: string;
}

export function decodeVendorSourceDeclaration(
  bytes: unknown,
): VendorRecordDecodeResult<VendorSourceDeclaration> {
  return decodeRecord(
    bytes,
    "vendor declaration",
    VendorSourceDeclarationSchema,
    freezeDeclaration,
    encodeVendorSourceDeclaration,
  );
}

export function decodeVendorProvenanceRecord(
  bytes: unknown,
): VendorRecordDecodeResult<VendorProvenanceRecord> {
  return decodeRecord(
    bytes,
    "vendor provenance",
    VendorProvenanceRecordSchema,
    freezeProvenance,
    encodeVendorProvenanceRecord,
  );
}

export function decodeVendorLockRecord(
  bytes: unknown,
): VendorRecordDecodeResult<VendorLockRecord> {
  return decodeRecord(
    bytes,
    "vendor lock",
    VendorLockRecordSchema,
    freezeLock,
    encodeVendorLockRecord,
  );
}

export function encodeVendorSourceDeclaration(value: VendorSourceDeclaration): Uint8Array {
  return canonicalJsonLine({
    curationRevision: value.curationRevision,
    destinationPath: value.destinationPath,
    lockPath: value.lockPath,
    policy: value.policy,
    provenancePath: value.provenancePath,
    refName: value.refName,
    repositoryIdentity: value.repositoryIdentity,
    schemaVersion: value.schemaVersion,
    sourceId: value.sourceId,
    sourcePath: value.sourcePath,
    supportedBaseline: value.supportedBaseline,
  });
}

export function encodeVendorProvenanceRecord(value: VendorProvenanceRecord): Uint8Array {
  return canonicalJsonLine({
    admitted: identityValue(value.admitted),
    curationRevision: value.curationRevision,
    disposition: value.disposition,
    importedPayloadDigest: value.importedPayloadDigest,
    observedAt: value.observedAt,
    observedLatest: identityValue(value.observedLatest),
    schemaVersion: value.schemaVersion,
    sourceId: value.sourceId,
    supportedBaseline: value.supportedBaseline,
  });
}

export function encodeVendorLockRecord(value: VendorLockRecord): Uint8Array {
  return canonicalJsonLine({
    admitted: identityValue(value.admitted),
    schemaVersion: value.schemaVersion,
    sourceId: value.sourceId,
  });
}

export function vendorPayloadDigest(entries: readonly VendorPayloadDigestEntry[]): string {
  return contentDigest(canonicalJsonLine(entries.map((entry) => ({
    blob: entry.blob,
    mode: entry.mode,
    path: entry.path,
  }))));
}

function decodeRecord<const Schema extends TSchema, ValueType>(
  bytes: unknown,
  label: string,
  schema: Schema,
  freeze: (value: Static<Schema>) => ValueType,
  encode: (value: ValueType) => Uint8Array,
): VendorRecordDecodeResult<ValueType> {
  const decoded = decodeCanonicalJson(bytes, label, MAX_VENDOR_RECORD_BYTES);
  if (!decoded.ok) {
    return failed("Invalid", decoded.issues.map((issue) => issue.message).join("; "));
  }
  if (!Value.Check(schema, decoded.value)) {
    return failed("Invalid", `${label} does not match its closed schema`);
  }
  const value = freeze(decoded.value);
  const canonical = encode(value);
  if (!(bytes instanceof Uint8Array) || !equalBytes(bytes, canonical)) {
    return failed("NonCanonical", `${label} bytes are not the unique canonical representation`);
  }
  return Object.freeze({
    ok: true,
    value,
    exactBytes: new Uint8Array(canonical),
    contentDigest: contentDigest(canonical),
  });
}

function freezeDeclaration(value: Static<typeof VendorSourceDeclarationSchema>): VendorSourceDeclaration {
  return Object.freeze({ ...value });
}

function freezeProvenance(value: Static<typeof VendorProvenanceRecordSchema>): VendorProvenanceRecord {
  return Object.freeze({
    ...value,
    admitted: freezeIdentity(value.admitted),
    observedLatest: freezeIdentity(value.observedLatest),
  });
}

function freezeLock(value: Static<typeof VendorLockRecordSchema>): VendorLockRecord {
  return Object.freeze({ ...value, admitted: freezeIdentity(value.admitted) });
}

function freezeIdentity(value: Static<typeof VendorLockRecordSchema>["admitted"]): VendorSourceIdentity {
  return Object.freeze({ ...value });
}

function identityValue(value: VendorSourceIdentity): CanonicalJsonValue {
  return {
    payloadDigest: value.payloadDigest,
    refName: value.refName,
    repositoryIdentity: value.repositoryIdentity,
    sourceCommit: value.sourceCommit,
    sourceTree: value.sourceTree,
  };
}

function failed(kind: VendorRecordDecodeFailure["kind"], detail: string): VendorRecordDecodeResult<never> {
  return Object.freeze({ ok: false, failure: Object.freeze({ kind, detail }) });
}
