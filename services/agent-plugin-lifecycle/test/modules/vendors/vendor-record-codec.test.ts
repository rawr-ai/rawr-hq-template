import { describe, expect, it } from "vitest";

import type {
  VendorLockRecord,
  VendorProvenanceRecord,
  VendorSourceDeclaration,
  VendorSourceIdentity,
} from "../../../src/service/modules/vendors/model/dto/vendor-records";
import {
  decodeVendorLockRecord,
  decodeVendorProvenanceRecord,
  decodeVendorSourceDeclaration,
  encodeVendorLockRecord,
  encodeVendorProvenanceRecord,
  encodeVendorSourceDeclaration,
  type VendorPayloadDigestEntry,
  type VendorRecordDecodeResult,
  vendorPayloadDigest,
} from "../../../src/service/modules/vendors/model/policy/vendor-record-codec";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const identity: VendorSourceIdentity = Object.freeze({
  repositoryIdentity: "git:vendor/example",
  refName: "refs/heads/main",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
  payloadDigest: `sha256_${"c".repeat(64)}`,
});

const declaration: VendorSourceDeclaration = Object.freeze({
  schemaVersion: 1,
  sourceId: "example",
  policy: "tracked",
  repositoryIdentity: identity.repositoryIdentity,
  refName: identity.refName,
  sourcePath: "source",
  destinationPath: "plugins/example/vendor",
  provenancePath: "vendor/provenance/example.json",
  lockPath: "vendor/locks/example.json",
  curationRevision: 1,
  supportedBaseline: "example@1",
});

const provenance: VendorProvenanceRecord = Object.freeze({
  schemaVersion: 1,
  sourceId: "example",
  admitted: identity,
  importedPayloadDigest: identity.payloadDigest,
  curationRevision: 1,
  supportedBaseline: "example@1",
  observedLatest: identity,
  observedAt: "2026-07-17T18:20:30.123Z",
  disposition: "admitted",
});

const lock: VendorLockRecord = Object.freeze({
  schemaVersion: 1,
  sourceId: "example",
  admitted: identity,
});

describe("vendor record codec", () => {
  it.each([
    ["declaration", decodeVendorSourceDeclaration],
    ["provenance", decodeVendorProvenanceRecord],
    ["lock", decodeVendorLockRecord],
  ] as const)("rejects corrupt %s records as invalid", (_label, decode) => {
    const result = decode(encoder.encode('{"schemaVersion":999}\n'));

    expect(result).toEqual({
      ok: false,
      failure: expect.objectContaining({ kind: "Invalid" }),
    });
  });

  it("rejects noncanonical records without changing their meaning", () => {
    expectNonCanonical(declaration, encodeVendorSourceDeclaration, decodeVendorSourceDeclaration);
    expectNonCanonical(provenance, encodeVendorProvenanceRecord, decodeVendorProvenanceRecord);
    expectNonCanonical(lock, encodeVendorLockRecord, decodeVendorLockRecord);
  });

  it("emits deterministic exact canonical bytes and content digests", () => {
    expectDeterministic(declaration, encodeVendorSourceDeclaration, decodeVendorSourceDeclaration);
    expectDeterministic(provenance, encodeVendorProvenanceRecord, decodeVendorProvenanceRecord);
    expectDeterministic(lock, encodeVendorLockRecord, decodeVendorLockRecord);
  });

  it("keeps payload digest semantics deterministic and order-sensitive", () => {
    const entries: readonly VendorPayloadDigestEntry[] = [
      { path: "SKILL.md", mode: "100644", blob: "d".repeat(40) },
      { path: "references/guide.md", mode: "100755", blob: "e".repeat(40) },
    ];

    expect(vendorPayloadDigest(entries)).toBe(
      vendorPayloadDigest(entries.map((entry) => ({ ...entry })))
    );
    expect(vendorPayloadDigest([...entries].reverse())).not.toBe(vendorPayloadDigest(entries));
  });
});

function expectNonCanonical<T>(
  value: T,
  encode: (value: T) => Uint8Array,
  decode: (bytes: unknown) => VendorRecordDecodeResult<T>
): void {
  const canonical = decoder.decode(encode(value));
  const result = decode(encoder.encode(` ${canonical}`));

  expect(result).toEqual({
    ok: false,
    failure: expect.objectContaining({ kind: "NonCanonical" }),
  });
}

function expectDeterministic<T>(
  value: T,
  encode: (value: T) => Uint8Array,
  decode: (bytes: unknown) => VendorRecordDecodeResult<T>
): void {
  const first = encode(value);
  const second = encode(value);
  const firstDecoded = decode(first);
  const secondDecoded = decode(second);

  expect(second).toEqual(first);
  expect(firstDecoded).toMatchObject({
    ok: true,
    exactBytes: first,
    contentDigest: expect.stringMatching(/^sha256_[0-9a-f]{64}$/u),
  });
  expect(secondDecoded).toMatchObject({
    ok: true,
    exactBytes: second,
    contentDigest: firstDecoded.ok ? firstDecoded.contentDigest : "unreachable",
  });
}
