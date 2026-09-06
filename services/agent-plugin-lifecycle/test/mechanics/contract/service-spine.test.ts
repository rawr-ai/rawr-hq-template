import type { ContentWorkspaceFailure } from "@habitat-ai/resource-content-workspace";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { parseReleaseRelativePath } from "../../../src/service/model/policy/release-identity";
import { router } from "../../../src/service/router";
import { testRequest } from "../../support/modules/providers/fixture";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../support/service/client";
import { productFixture } from "../../support/service/release-fixtures";

describe("agent plugin lifecycle oRPC service spine", () => {
  it("composes only the five domain module routers", () => {
    expect(Object.keys(router).sort()).toEqual([
      "governance",
      "packaging",
      "providers",
      "releases",
      "vendors",
    ]);
  });

  it("constructs provider selection from the raw content-workspace host port", async () => {
    let selectionCalls = 0;
    let nativeCalls = 0;
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        inspectGitWorkspace: () =>
          Effect.suspend(() => {
            selectionCalls += 1;
            return Effect.fail({
              _tag: "ContentWorkspaceFailure",
              operation: "inspect-git-workspace",
              reason: "GitFailed",
              detail: "Fixture content workspace is intentionally unavailable",
            } satisfies ContentWorkspaceFailure);
          }),
      },
      nativeProviders: Object.freeze({
        codex: Object.freeze({
          acquire: () =>
            Effect.sync(() => {
              nativeCalls += 1;
              throw new Error("Unexpected native provider acquisition");
            }),
        }),
        claude: Object.freeze({
          acquire: () =>
            Effect.sync(() => {
              nativeCalls += 1;
              throw new Error("Unexpected native provider acquisition");
            }),
        }),
      }),
    });
    const releaseInputPath = parseReleaseRelativePath(
      ".habitat/release-input.json",
      "contentWorkspace.releaseInputPath"
    );
    if (!releaseInputPath.ok) throw new Error("Invalid service-spine release-input fixture");
    const request = {
      ...testRequest,
      contentWorkspace: {
        ...testRequest.contentWorkspace,
        releaseInputPath: releaseInputPath.value,
      },
    };

    await expect(client.providers.test(request, testInvocation)).resolves.toMatchObject({
      operation: "test",
      classification: "Blocked",
      selection: null,
      issues: [{ code: "SelectionRejected" }],
    });
    expect(selectionCalls).toBe(1);
    expect(nativeCalls).toBe(0);
    expect(Object.keys(router.providers).sort()).toEqual(["status", "sync", "test"]);
  });

  it("runs a pure Effect-backed procedure without synthetic telemetry dependencies", async () => {
    const client = createLifecycleTestClient();
    const result = await client.releases.releaseInputRecord(
      {
        kind: "encode-body",
        body: productFixture().releaseInput.body,
      },
      testInvocation
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected canonical release input");
    expect(result.value.bytes).toBeInstanceOf(Uint8Array);
    expect(result.value.byteLength).toBe(result.value.bytes.byteLength);
  });
});
