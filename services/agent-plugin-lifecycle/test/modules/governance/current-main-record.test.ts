import { describe, expect, it } from "vitest";

import type { Client } from "../../../src/client";
import { createLifecycleTestClient, testInvocation } from "../../support/client";

describe("current-main record procedure", () => {
  it("encodes and validates v2 records without consulting lifecycle ports", async () => {
    const client = createLifecycleTestClient();
    const encoded = await client.governance.currentMainRecord({
      kind: "encode-body",
      body: bodyFixture(),
    }, testInvocation);

    expect(encoded).toMatchObject({
      ok: true,
      value: { protocol: "agent-plugin-current-main@v2" },
    });
    if (!encoded.ok) throw new Error(encoded.failure.message);

    await expect(client.governance.currentMainRecord({
      kind: "validate-envelope",
      bytes: encoded.value.bytes,
    }, testInvocation)).resolves.toEqual(encoded);
  });
});

function bodyFixture(): Extract<
  Parameters<Client["governance"]["currentMainRecord"]>[0],
  { kind: "encode-body" }
>["body"] {
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
