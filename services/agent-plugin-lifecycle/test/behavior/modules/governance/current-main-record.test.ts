import { describe, expect, it } from "vitest";

import type { Client } from "../../../../src/client";
import { parseReleaseInputDigest } from "../../../../src/service/model/policy/release-digest";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseRepositoryIdentity,
} from "../../../../src/service/model/policy/release-identity";
import { createLifecycleTestClient, testInvocation } from "../../../support/service/client";

describe("current-main record procedure", () => {
  it("encodes and validates direct v3 records without consulting lifecycle ports", async () => {
    const client = createLifecycleTestClient();
    const encoded = await client.governance.currentMainRecord(
      {
        kind: "encode-body",
        body: bodyFixture(),
      },
      testInvocation
    );

    expect(encoded).toMatchObject({
      ok: true,
      value: {
        protocol: "agent-plugin-current-main@v3",
        record: bodyFixture(),
      },
    });
    if (!encoded.ok) throw new Error(encoded.failure.message);
    if (!(encoded.value.bytes instanceof Uint8Array)) {
      throw new Error("Governance record policy did not return runtime bytes");
    }

    await expect(
      client.governance.currentMainRecord(
        {
          kind: "validate-record",
          bytes: encoded.value.bytes,
        },
        testInvocation
      )
    ).resolves.toEqual(encoded);
  });

  it("rejects a non-byte runtime carrier through Governance record policy", async () => {
    const client = createLifecycleTestClient();

    await expect(
      Reflect.apply(client.governance.currentMainRecord, undefined, [
        { kind: "validate-record", bytes: "{}\n" },
        testInvocation,
      ])
    ).resolves.toMatchObject({
      ok: false,
      failure: { code: "InvalidSchema" },
    });
  });
});

function bodyFixture(): Extract<
  Parameters<Client["governance"]["currentMainRecord"]>[0],
  { kind: "encode-body" }
>["body"] {
  return {
    schemaVersion: 3,
    channel: "current-main",
    contentAuthority: mustParse(parseContentAuthority("rawr-hq")),
    sourceRepositoryIdentity: mustParse(parseRepositoryIdentity("git:github.com/rawr-ai/rawr-hq")),
    sourceRepositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
    sourceRef: "refs/tags/agent-plugins/current-main-input",
    contentCommit: mustParse(parseGitCommitId("a".repeat(40))),
    contentTree: mustParse(parseGitTreeId("b".repeat(40))),
    releaseInputDigest: mustParse(parseReleaseInputDigest(`ri1_${"c".repeat(64)}`)),
  };
}

function mustParse<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false }
): T {
  if (!result.ok) throw new Error("Invalid current-main fixture value");
  return result.value;
}
