import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { ContentWorkspaceFailure } from "@rawr/resource-content-workspace";
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

    const procedureAnalytics = analyticsEntries.filter(
      (entry) =>
        entry.event === "orpc.procedure" && entry.payload.path === "releases.releaseInputRecord"
    );
    const procedureLogs = logEntries.filter(
      (entry) =>
        entry.event === "agent-plugin-lifecycle.procedure" &&
        entry.payload.path === "releases.releaseInputRecord"
    );

    expect(procedureAnalytics).toHaveLength(1);
    expect(procedureAnalytics[0]).toEqual({
      event: "orpc.procedure",
      payload: expect.objectContaining({
        app: "agent-plugin-lifecycle",
        path: "releases.releaseInputRecord",
        outcome: "success",
        analytics_trace_id: "trace-agent-plugin-lifecycle-test",
        analytics_command_id: "command-agent-plugin-lifecycle-test",
      }),
    });
    expect(procedureLogs).toHaveLength(1);
    expect(procedureLogs[0]).toEqual({
      level: "info",
      event: "agent-plugin-lifecycle.procedure",
      payload: expect.objectContaining({
        path: "releases.releaseInputRecord",
        outcome: "success",
        domain: "agent-plugin-lifecycle",
      }),
    });
  });
});
