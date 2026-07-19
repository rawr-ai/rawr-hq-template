import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CURRENT_MAIN_V2_PROTOCOL,
  MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES,
  canonicalSerializeCurrentMainBodyV2,
  encodeCurrentMainBodyV2,
  validateCurrentMainEnvelopeV2,
  type CurrentMainBodyV2,
} from "../../../src/service/modules/governance/model";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("current-main v2 codec", () => {
  it("encodes insertion-order variants to one canonical envelope and digest", () => {
    const body = bodyFixture();
    const reordered = {
      projections: body.projections.map((projection) => ({
        capabilityProfileDigest: projection.capabilityProfileDigest,
        adapterProtocol: projection.adapterProtocol,
        rendererProtocol: projection.rendererProtocol,
        projectionDigest: projection.projectionDigest,
        provider: projection.provider,
      })),
      evaluationProfile: body.evaluationProfile,
      releaseSetDigest: body.releaseSetDigest,
      releaseInputDigest: body.releaseInputDigest,
      sourceTree: body.sourceTree,
      sourceCommit: body.sourceCommit,
      sourceRepositoryIdentity: body.sourceRepositoryIdentity,
      contentAuthority: body.contentAuthority,
      channel: body.channel,
      schemaVersion: body.schemaVersion,
    };

    const first = mustEncode(body);
    const second = mustEncode(reordered);

    expect(second.bytes).toEqual(first.bytes);
    expect(second.byteLength).toBe(first.byteLength);
    expect(second.currentMainDigest).toBe(first.currentMainDigest);
    expect(second.protocol).toBe(CURRENT_MAIN_V2_PROTOCOL);
    const expectedDigest = createHash("sha256")
      .update(canonicalSerializeCurrentMainBodyV2(first.record.body))
      .digest("hex");
    expect(first.currentMainDigest).toBe(`cm2_${expectedDigest}`);
  });

  it("round-trips only the unique newline-terminated canonical envelope", () => {
    const encoded = mustEncode(bodyFixture());
    const decoded = validateCurrentMainEnvelopeV2(encoded.bytes);

    expect(decoded).toEqual({ ok: true, value: encoded });
    expect(decoder.decode(encoded.bytes).endsWith("\n")).toBe(true);

    const withoutNewline = encoded.bytes.slice(0, -1);
    expect(validateCurrentMainEnvelopeV2(withoutNewline)).toMatchObject({
      ok: false,
      failure: { code: "NonCanonical" },
    });

    const wire = parseEnvelope(encoded.bytes);
    const reordered = canonicalBytes({
      body: wire.body,
      currentMainDigest: wire.currentMainDigest,
      schemaVersion: wire.schemaVersion,
    });
    expect(validateCurrentMainEnvelopeV2(reordered)).toMatchObject({
      ok: false,
      failure: { code: "NonCanonical" },
    });
  });

  it("rejects surplus body and envelope fields", () => {
    expect(encodeCurrentMainBodyV2({ ...bodyFixture(), approver: "person" })).toMatchObject({
      ok: false,
      failure: { code: "InvalidSchema" },
    });

    const encoded = mustEncode(bodyFixture());
    const wire = parseEnvelope(encoded.bytes);
    expect(validateCurrentMainEnvelopeV2(canonicalBytes({ ...wire, receipt: "state" }))).toMatchObject({
      ok: false,
      failure: { code: "InvalidSchema" },
    });
    expect(encodeCurrentMainBodyV2({
      ...bodyFixture(),
      projections: [
        { ...bodyFixture().projections[0], receipt: "state" },
        bodyFixture().projections[1],
      ],
    })).toMatchObject({ ok: false, failure: { code: "InvalidSchema" } });
  });

  it("rejects malformed and overbound envelopes", () => {
    expect(validateCurrentMainEnvelopeV2(new Uint8Array([0xff]))).toMatchObject({
      ok: false,
      failure: { code: "InvalidSchema" },
    });
    expect(
      validateCurrentMainEnvelopeV2(new Uint8Array(MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES + 1)),
    ).toMatchObject({
      ok: false,
      failure: { code: "EnvelopeTooLarge" },
    });
  });

  it("rejects a canonical envelope whose claimed digest does not bind its body", () => {
    const encoded = mustEncode(bodyFixture());
    const wire = parseEnvelope(encoded.bytes);
    const altered = canonicalBytes({
      schemaVersion: wire.schemaVersion,
      currentMainDigest: `cm2_${"0".repeat(64)}`,
      body: wire.body,
    });

    expect(validateCurrentMainEnvelopeV2(altered)).toMatchObject({
      ok: false,
      failure: { code: "DigestMismatch" },
    });
  });

  it.each([
    ["unknown", [{ ...bodyFixture().projections[0], provider: "other" }, bodyFixture().projections[1]]],
    ["missing", [bodyFixture().projections[0]]],
    ["duplicate", [bodyFixture().projections[0], bodyFixture().projections[0]]],
    ["reordered", [...bodyFixture().projections].reverse()],
  ])("rejects the %s provider tuple", (_label, projections) => {
    expect(encodeCurrentMainBodyV2({ ...bodyFixture(), projections })).toMatchObject({
      ok: false,
      failure: { code: "InvalidSchema" },
    });

    const wire = parseEnvelope(mustEncode(bodyFixture()).bytes);
    expect(validateCurrentMainEnvelopeV2(canonicalBytes({
      schemaVersion: wire.schemaVersion,
      currentMainDigest: wire.currentMainDigest,
      body: { ...(wire.body as Record<string, unknown>), projections },
    }))).toMatchObject({
      ok: false,
      failure: { code: "InvalidSchema" },
    });
  });

  it("rejects invalid source identities", () => {
    expect(encodeCurrentMainBodyV2({
      ...bodyFixture(),
      sourceRepositoryIdentity: "file:/tmp/rawr-hq",
    })).toMatchObject({ ok: false, failure: { code: "InvalidSchema" } });
    expect(encodeCurrentMainBodyV2({
      ...bodyFixture(),
      sourceCommit: "HEAD",
    })).toMatchObject({ ok: false, failure: { code: "InvalidSchema" } });
    expect(encodeCurrentMainBodyV2({
      ...bodyFixture(),
      schemaVersion: 1,
    })).toMatchObject({ ok: false, failure: { code: "InvalidSchema" } });
  });
});

function bodyFixture(): CurrentMainBodyV2 {
  return {
    schemaVersion: 2,
    channel: "current-main",
    contentAuthority: "rawr-hq",
    sourceRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
    sourceCommit: "a".repeat(40),
    sourceTree: "b".repeat(40),
    releaseInputDigest: `ri1_${"c".repeat(64)}`,
    releaseSetDigest: `rs1_${"d".repeat(64)}`,
    evaluationProfile: "provider-smoke@v1",
    projections: [
      {
        provider: "claude",
        projectionDigest: `ap1_${"e".repeat(64)}`,
        rendererProtocol: "claude-projection@v1",
        adapterProtocol: "claude-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"f".repeat(64)}`,
      },
      {
        provider: "codex",
        projectionDigest: `ap1_${"1".repeat(64)}`,
        rendererProtocol: "codex-projection@v1",
        adapterProtocol: "codex-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"2".repeat(64)}`,
      },
    ],
  };
}

function mustEncode(input: unknown) {
  const result = encodeCurrentMainBodyV2(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result.value;
}

function parseEnvelope(bytes: Uint8Array): Record<string, unknown> & {
  schemaVersion: number;
  currentMainDigest: string;
  body: unknown;
} {
  return JSON.parse(decoder.decode(bytes)) as Record<string, unknown> & {
    schemaVersion: number;
    currentMainDigest: string;
    body: unknown;
  };
}

function canonicalBytes(value: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}
