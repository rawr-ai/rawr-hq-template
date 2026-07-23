import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { describe, expect, it } from "vitest";

import { router } from "../src/service/router";
import { parseReleaseRelativePath } from "../src/service/shared/release";
import { testRequest } from "./modules/providers/fixture";
import { productFixture } from "./shared/release/fixtures";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "./support/client";

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

  it("preserves baseline analytics and logging around Effect-backed procedures", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const client = createLifecycleTestClient({
      analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
      logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
    });

    await client.releases.releaseInputRecord(
      {
        kind: "encode-body",
        body: productFixture().releaseInput.body,
      },
      testInvocation
    );

    expect(analyticsEntries).toContainEqual({
      event: "orpc.procedure",
      payload: expect.objectContaining({
        app: "agent-plugin-lifecycle",
        path: "releases.releaseInputRecord",
        outcome: "success",
        analytics_trace_id: "trace-agent-plugin-lifecycle-test",
        analytics_command_id: "command-agent-plugin-lifecycle-test",
      }),
    });
    expect(logEntries).toContainEqual({
      level: "info",
      event: "orpc.procedure",
      payload: expect.objectContaining({
        path: "releases.releaseInputRecord",
        outcome: "success",
        domain: "agent-plugin-lifecycle",
      }),
    });
  });
});
