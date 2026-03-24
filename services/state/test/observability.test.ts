import { createEmbeddedPlaceholderAnalyticsAdapter, type EmbeddedPlaceholderAnalyticsEntry } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter, type EmbeddedPlaceholderLogEntry } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { describe, expect, it } from "vitest";
import { createClient } from "../src";

type LogEntry = EmbeddedPlaceholderLogEntry;
type AnalyticsEntry = EmbeddedPlaceholderAnalyticsEntry;

function createClientOptions(input: {
  repoRoot?: string;
  logs?: LogEntry[];
  analytics?: AnalyticsEntry[];
} = {}) {
  return {
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter({ sink: input.logs }),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: input.analytics }),
    },
    scope: {
      repoRoot: input.repoRoot ?? "/tmp/rawr-state-observability",
    },
    config: {},
  } as const;
}

function invocation(traceId = "trace-state-default") {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

describe("state observability", () => {
  it("adds state-specific log and analytics fields on top of the baseline lifecycle", async () => {
    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({
      repoRoot: "/tmp/rawr-state-observability",
      logs,
      analytics,
    }));

    const result = await client.getState({}, invocation("trace-state-observability"));

    expect(result.authorityRepoRoot).toBe("/tmp/rawr-state-observability");
    expect(logs.some((entry) =>
      entry.event === "state.procedure"
      && entry.payload.repoRoot === "/tmp/rawr-state-observability"
      && entry.payload.invocationTraceId === "trace-state-observability"
      && entry.payload.outcome === "success")).toBe(true);
    expect(analytics.some((entry) =>
      entry.event === "orpc.procedure"
      && entry.payload.path === "getState"
      && entry.payload.analytics_repo_root === "/tmp/rawr-state-observability"
      && entry.payload.analytics_trace_id === "trace-state-observability")).toBe(true);
  });
});
