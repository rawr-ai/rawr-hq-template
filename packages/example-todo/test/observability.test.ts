import { context, trace, type Attributes, type Context, type Span, type SpanContext, type SpanStatus } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { describe, expect, it } from "vitest";
import { safe } from "@orpc/server";
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

describe("example-todo observability", () => {
  it("enriches the active span and emits package/base observability logs", async () => {
    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({ logs, analytics }));

    await withRecordingSpan(async (span) => {
      await client.tags.list({}, invocation("trace-observability"));

      expect(span.attributes["rawr.orpc.path"]).toBe("tags.list");
      expect(span.attributes["rawr.orpc.domain"]).toBe("todo");
      expect(span.attributes["rawr.orpc.audience"]).toBe("internal");
      expect(span.attributes["rawr.todo.workspace_id"]).toBe("workspace-default");
      expect(span.attributes["rawr.todo.invocation_trace_id"]).toBe("trace-observability");
      expect(span.events.map((event) => event.name)).toEqual(expect.arrayContaining([
        "rawr.orpc.procedure.started",
        "rawr.orpc.procedure.succeeded",
        "todo.procedure.started",
        "todo.procedure.succeeded",
      ]));
    });

    expect(logs.some((entry) => entry.event === "orpc.procedure" && entry.payload.outcome === "success")).toBe(true);
    expect(logs.some((entry) => entry.event === "todo.procedure" && entry.payload.outcome === "success")).toBe(true);
    expect(logs.some((entry) => entry.payload.spanTraceId === "1234567890abcdef1234567890abcdef")).toBe(true);
    expect(analytics.some((entry) => entry.event === "orpc.procedure" && entry.payload.path === "tags.list")).toBe(true);
  });

  it("degrades safely when no active span exists", async () => {
    const logs: LogEntry[] = [];
    const client = createClient(createClientOptions({ logs }));

    await expect(client.tags.list({}, invocation("trace-no-span"))).resolves.toEqual([]);
    expect(logs.some((entry) => entry.event === "orpc.procedure")).toBe(true);
    expect(logs.some((entry) => entry.event === "todo.procedure")).toBe(true);
  });

  it("adds package-specific observability signals for policy failures", async () => {
    const logs: LogEntry[] = [];
    const client = createClient(createClientOptions({ logs, readOnly: true }));

    await withRecordingSpan(async (span) => {
      await safe(client.tasks.create({ title: "blocked write" }, invocation("trace-policy")));

      expect(span.events.map((event) => event.name)).toEqual(expect.arrayContaining([
        "todo.procedure.failed",
        "todo.policy.read_only_rejected",
      ]));
    });

    expect(logs.some((entry) =>
      entry.event === "todo.procedure"
      && entry.payload.outcome === "error"
      && entry.payload.code === "READ_ONLY_MODE")).toBe(true);
  });
});
