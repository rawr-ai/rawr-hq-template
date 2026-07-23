import { describe, expect, it } from "vitest";

import {
  CURRENT_MAIN_V3_PROTOCOL,
  type CurrentMainBodyV3,
  encodeCurrentMainBodyV3,
  MAX_CURRENT_MAIN_V3_RECORD_BYTES,
  validateCurrentMainRecordV3,
} from "../../../src/service/modules/governance/model";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("current-main v3 codec", () => {
  it("encodes one direct closed record independent of input key order", () => {
    const record = recordFixture();
    const reordered = {
      releaseInputDigest: record.releaseInputDigest,
      contentTree: record.contentTree,
      contentCommit: record.contentCommit,
      sourceRef: record.sourceRef,
      sourceRepositoryUrl: record.sourceRepositoryUrl,
      sourceRepositoryIdentity: record.sourceRepositoryIdentity,
      contentAuthority: record.contentAuthority,
      channel: record.channel,
      schemaVersion: record.schemaVersion,
    };

    const first = mustEncode(record);
    const second = mustEncode(reordered);

    expect(second.bytes).toEqual(first.bytes);
    expect(second.byteLength).toBe(first.byteLength);
    expect(second.protocol).toBe(CURRENT_MAIN_V3_PROTOCOL);
    expect(JSON.parse(decoder.decode(first.bytes))).toEqual(record);
    expect(Object.keys(JSON.parse(decoder.decode(first.bytes))).sort()).toEqual(
      Object.keys(record).sort()
    );
    expect(Object.keys(first).sort()).toEqual(["byteLength", "bytes", "protocol", "record"]);
  });

  it("round-trips only the unique newline-terminated direct record", () => {
    const encoded = mustEncode(recordFixture());

    expect(validateCurrentMainRecordV3(encoded.bytes)).toEqual({
      ok: true,
      value: encoded,
    });
    expect(decoder.decode(encoded.bytes).endsWith("\n")).toBe(true);
    expect(validateCurrentMainRecordV3(encoded.bytes.slice(0, -1))).toMatchObject({
      ok: false,
      failure: { code: "NonCanonical" },
    });
    expect(
      validateCurrentMainRecordV3(
        encoder.encode(`${JSON.stringify({ ...recordFixture(), recordDigest: "state" })}\n`)
      )
    ).toMatchObject({ ok: false, failure: { code: "InvalidSchema" } });
  });

  it("rejects v2 and every removed authority-shaped field", () => {
    const record = recordFixture();
    for (const candidate of [
      { ...record, schemaVersion: 2 },
      { ...record, currentMainDigest: `cm2_${"0".repeat(64)}` },
      { ...record, sourceCommit: record.contentCommit },
      { ...record, sourceTree: record.contentTree },
      { ...record, releaseSetDigest: `rs1_${"0".repeat(64)}` },
      { ...record, evaluationProfile: "provider-smoke@v1" },
      { ...record, projections: [] },
      { ...record, recordCommit: "f".repeat(40) },
      { ...record, recordTree: "e".repeat(40) },
    ]) {
      expect(encodeCurrentMainBodyV3(candidate)).toMatchObject({
        ok: false,
        failure: { code: "InvalidSchema" },
      });
    }
  });

  it("rejects repository URLs, refs, and object identities outside the record policy", () => {
    const record = recordFixture();
    for (const candidate of [
      {
        ...record,
        sourceRepositoryUrl: "ssh://git@github.com/rawr-ai/rawr-hq.git",
      },
      {
        ...record,
        sourceRepositoryUrl: "https://github.com/rawr-ai/other.git",
      },
      { ...record, sourceRef: "main" },
      { ...record, sourceRef: "refs/heads/main" },
      { ...record, sourceRef: "refs/tags/../release" },
      { ...record, sourceRef: "refs/tags/a." },
      { ...record, contentCommit: "HEAD" },
      { ...record, contentTree: "tree" },
    ]) {
      expect(encodeCurrentMainBodyV3(candidate)).toMatchObject({
        ok: false,
        failure: { code: "InvalidSchema" },
      });
    }
  });

  it("bounds record input before canonicalization", () => {
    expect(validateCurrentMainRecordV3(new Uint8Array([0xff]))).toMatchObject({
      ok: false,
      failure: { code: "InvalidSchema" },
    });
    expect(
      validateCurrentMainRecordV3(new Uint8Array(MAX_CURRENT_MAIN_V3_RECORD_BYTES + 1))
    ).toMatchObject({ ok: false, failure: { code: "RecordTooLarge" } });
  });
});

function recordFixture(): CurrentMainBodyV3 {
  return {
    schemaVersion: 3,
    channel: "current-main",
    contentAuthority: mustParse(parseContentAuthority("rawr-hq")),
    sourceRepositoryIdentity: mustParse(parseRepositoryIdentity("git:github.com/rawr-ai/rawr-hq")),
    sourceRepositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
    sourceRef: "refs/tags/agent-plugins/current-main-input",
    contentCommit: mustParse(parseGitCommitId("a".repeat(40))),
    contentTree: mustParse(parseGitTreeId("b".repeat(40))),
    releaseInputDigest: `ri1_${"c".repeat(64)}`,
  };
}

function mustParse<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false }
): T {
  if (!result.ok) throw new Error("Invalid current-main fixture value");
  return result.value;
}

function mustEncode(input: unknown) {
  const result = encodeCurrentMainBodyV3(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result.value;
}
