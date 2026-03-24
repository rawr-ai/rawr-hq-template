import { context, trace, type Attributes, type Context, type Span, type SpanContext, type SpanStatus } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { describe, expect, it } from "vitest";
import { createClient } from "../src";
import {
  createClientOptions,
  invocation,
  type AnalyticsEntry,
  type LogEntry,
} from "./helpers";

class RecordingSpan implements Span {
  readonly attributes: Record<string, string | number | boolean> = {};
  readonly events: Array<{ name: string; attributes?: Attributes }> = [];
  readonly exceptions: unknown[] = [];
  status: SpanStatus = { code: 0 };

  spanContext(): SpanContext {
    return {
      traceId: "1234567890abcdef1234567890abcdef",
      spanId: "1234567890abcdef",
      traceFlags: 1,
    };
  }

  setAttribute(key: string, value: string | number | boolean) {
    this.attributes[key] = value;
    return this;
  }

  setAttributes(attributes: Attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        this.attributes[key] = value;
      }
    }
    return this;
  }

  addEvent(name: string, attributes?: Attributes) {
    this.events.push({ name, attributes });
    return this;
  }

  setStatus(status: SpanStatus) {
    this.status = status;
    return this;
  }

  updateName() {
    return this;
  }

  end() {}

  isRecording() {
    return true;
  }

  recordException(exception: unknown) {
    this.exceptions.push(exception);
  }

  addLink() {
    return this;
  }

  addLinks() {
    return this;
  }
}

async function withRecordingSpan<T>(callback: (span: RecordingSpan) => Promise<T>) {
  const manager = new AsyncLocalStorageContextManager().enable();
  context.setGlobalContextManager(manager);

  try {
    const span = new RecordingSpan();
    return await context.with(trace.setSpan(context.active(), span as unknown as Span) as Context, async () => {
      return callback(span);
    });
  }
  finally {
    manager.disable();
  }
}

describe("state observability", () => {
  it("enriches the active span and emits state/base observability signals", async () => {
    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({
      repoRoot: "/tmp/rawr-state-observability",
      logs,
      analytics,
    }));

    await withRecordingSpan(async (span) => {
      const result = await client.getState({}, invocation("trace-state-observability"));

      expect(result.authorityRepoRoot).toBe("/tmp/rawr-state-observability");
      expect(span.attributes["rawr.orpc.path"]).toBe("getState");
      expect(span.attributes["rawr.orpc.domain"]).toBe("state");
      expect(span.attributes["rawr.orpc.audience"]).toBe("internal");
      expect(span.attributes["rawr.state.repo_root"]).toBe("/tmp/rawr-state-observability");
      expect(span.attributes["rawr.state.invocation_trace_id"]).toBe("trace-state-observability");
      expect(span.events.map((event) => event.name)).toEqual(expect.arrayContaining([
        "rawr.orpc.procedure.started",
        "rawr.orpc.procedure.succeeded",
        "state.procedure.started",
        "state.procedure.succeeded",
      ]));
    });

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

  it("degrades safely when no active span exists", async () => {
    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({
      repoRoot: "/tmp/rawr-state-no-span",
      logs,
      analytics,
    }));

    await expect(client.getState({}, invocation("trace-state-no-span"))).resolves.toMatchObject({
      authorityRepoRoot: "/tmp/rawr-state-no-span",
    });
    expect(logs.some((entry) => entry.event === "orpc.procedure")).toBe(true);
    expect(logs.some((entry) => entry.event === "state.procedure")).toBe(true);
    expect(analytics.some((entry) => entry.event === "orpc.procedure")).toBe(true);
  });
});
