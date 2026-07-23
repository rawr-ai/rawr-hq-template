import { describe, expect, it } from "vitest";

import { router } from "../src/service/router";
import { parseReleaseRelativePath } from "../src/service/shared/release";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "./support/client";
import { testRequest } from "./modules/providers/fixture";

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
        inspectGitWorkspace: async () => {
          selectionCalls += 1;
          throw new Error("Fixture content workspace is intentionally unavailable");
        },
      },
      providerNativeSessions: {
        acquire: async () => {
          nativeCalls += 1;
          throw new Error("Unexpected native provider acquisition");
        },
      },
    });
    const releaseInputPath = parseReleaseRelativePath(
      ".rawr/release-input.json",
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
});
