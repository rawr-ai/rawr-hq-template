import { describe, expect, it } from "vitest";

import { canonicalSerializeAgentPluginReleaseInput } from "../../../../src/service/model/policy/release-input-codec";
import { createLifecycleTestClient, testInvocation } from "../../../support/service/client";
import { productFixture } from "../../../support/service/release-fixtures";

describe("release-input record procedure", () => {
  it("encodes and validates canonical records without consulting lifecycle ports", async () => {
    const client = createLifecycleTestClient();
    const fixture = productFixture();
    const encoded = await client.releases.releaseInputRecord(
      {
        kind: "encode-body",
        body: fixture.releaseInput.body,
      },
      testInvocation
    );

    expect(encoded).toMatchObject({
      ok: true,
      value: { releaseInputDigest: fixture.releaseInput.releaseInputDigest },
    });
    if (!encoded.ok) throw new Error(JSON.stringify(encoded.issues));
    if (!(encoded.value.bytes instanceof Uint8Array)) {
      throw new Error("Release-input record policy did not return runtime bytes");
    }
    expect(encoded.value.bytes).toEqual(
      canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput)
    );
    expect(encoded.value.byteLength).toBe(encoded.value.bytes.byteLength);

    await expect(
      client.releases.releaseInputRecord(
        {
          kind: "validate-envelope",
          bytes: encoded.value.bytes,
        },
        testInvocation
      )
    ).resolves.toEqual(encoded);
  });

  it("returns release-owned issues for invalid bodies and noncanonical envelopes", async () => {
    const client = createLifecycleTestClient();
    const fixture = productFixture();
    const invalidBody = await client.releases.releaseInputRecord(
      {
        kind: "encode-body",
        body: { ...fixture.releaseInput.body, unexpected: true },
      },
      testInvocation
    );

    expect(invalidBody).toMatchObject({
      ok: false,
      issues: [{ code: "UNKNOWN_FIELD", path: "releaseInput.body" }],
    });

    const canonicalBytes = canonicalSerializeAgentPluginReleaseInput(fixture.releaseInput);
    const noncanonicalBytes = new TextEncoder().encode(
      new TextDecoder("utf-8", { fatal: true }).decode(canonicalBytes).trimEnd()
    );
    const noncanonical = await client.releases.releaseInputRecord(
      {
        kind: "validate-envelope",
        bytes: noncanonicalBytes,
      },
      testInvocation
    );
    expect(noncanonical).toMatchObject({
      ok: false,
      issues: [{ code: "NON_CANONICAL_ENVELOPE", path: "releaseInput" }],
    });

    const nonBytes = await Reflect.apply(client.releases.releaseInputRecord, undefined, [
      { kind: "validate-envelope", bytes: "{}\n" },
      testInvocation,
    ]);
    expect(nonBytes).toMatchObject({
      ok: false,
      issues: [{ code: "EXPECTED_BYTES", path: "releaseInput" }],
    });
  });
});
