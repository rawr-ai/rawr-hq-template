import {
  type Attributes,
  type Context,
  context,
  type Span,
  type SpanContext,
  type SpanStatus,
  trace,
} from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { safe } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { createClient } from "../src/client";
import { type AnalyticsEntry, createClientOptions, invocation, type LogEntry } from "./helpers";

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
    return await context.with(
      trace.setSpan(context.active(), span as unknown as Span) as Context,
      async () => {
        return callback(span);
      }
    );
  } finally {
    manager.disable();
  }
}

describe("example-todo observability", () => {
  it("enriches the active span and emits one service observability lifecycle", async () => {
    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({ logs, analytics }));

    await withRecordingSpan(async (span) => {
      await client.tags.list({}, invocation("trace-observability"));

      expect(span.attributes["rawr.orpc.path"]).toBe("tags.list");
      expect(span.attributes["rawr.orpc.domain"]).toBe("todo");
      expect(span.attributes["rawr.orpc.audience"]).toBe("internal");
      expect(span.attributes["rawr.todo.module"]).toBe("tags");
      expect(span.attributes["rawr.todo.workspace_id"]).toBe("workspace-default");
      expect(span.attributes["rawr.todo.invocation_trace_id"]).toBe("trace-observability");
      expect(span.events.map((event) => event.name)).toEqual([
        "todo.procedure.started",
        "todo.tags.module.observed",
        "todo.procedure.succeeded",
      ]);
    });

    expect(
      logs.some((entry) => entry.event === "todo.procedure" && entry.payload.outcome === "success")
    ).toBe(true);
    expect(
      logs.some(
        (entry) =>
          entry.event === "todo.tags.module" &&
          entry.payload.layer === "module" &&
          entry.payload.path === "tags.list"
      )
    ).toBe(true);
    expect(
      logs.some((entry) => entry.payload.spanTraceId === "1234567890abcdef1234567890abcdef")
    ).toBe(true);
    expect(
      analytics.some(
        (entry) => entry.event === "orpc.procedure" && entry.payload.path === "tags.list"
      )
    ).toBe(true);
    expect(
      analytics.some(
        (entry) =>
          entry.event === "orpc.procedure" &&
          entry.payload.path === "tags.list" &&
          entry.payload.analytics_layer === "module" &&
          entry.payload.analytics_module === "tags" &&
          entry.payload.analytics_path === "tags.list" &&
          entry.payload.analytics_outcome === "success"
      )
    ).toBe(true);
  });

  it("degrades safely when no active span exists", async () => {
    const logs: LogEntry[] = [];
    const client = createClient(createClientOptions({ logs }));

    await expect(client.tags.list({}, invocation("trace-no-span"))).resolves.toEqual([]);
    expect(logs.some((entry) => entry.event === "todo.procedure")).toBe(true);
  });

  it("adds package-specific observability signals for policy failures", async () => {
    const logs: LogEntry[] = [];
    const client = createClient(createClientOptions({ logs, readOnly: true }));

    await withRecordingSpan(async (span) => {
      await safe(client.tasks.create({ title: "blocked write" }, invocation("trace-policy")));

      expect(span.events.map((event) => event.name)).toEqual(
        expect.arrayContaining(["todo.procedure.failed", "todo.policy.read_only_rejected"])
      );
    });

    expect(
      logs.some(
        (entry) =>
          entry.event === "todo.procedure" &&
          entry.payload.outcome === "error" &&
          entry.payload.code === "READ_ONLY_MODE"
      )
    ).toBe(true);
  });

  it("folds module and operation signals into the one service lifecycle", async () => {
    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({ logs, analytics }));

    const task = await client.tasks.create(
      { title: "Procedure-local example" },
      invocation("trace-seed-task")
    );
    const tag = await withRecordingSpan(async (span) => {
      const created = await client.tags.create(
        { name: "proc-local", color: "#336699" },
        invocation("trace-seed-tag")
      );

      expect(span.events.map((event) => event.name)).toEqual([
        "todo.procedure.started",
        "todo.tags.module.observed",
        "todo.tags.create.normalization.started",
        "todo.tags.create.normalization.succeeded",
        "todo.procedure.succeeded",
      ]);

      return created;
    });

    expect(
      analytics.some(
        (entry) =>
          entry.event === "orpc.procedure" &&
          entry.payload.path === "tags.create" &&
          entry.payload.analytics_layer === "procedure" &&
          entry.payload.analytics_procedure === "tags.create" &&
          entry.payload.analytics_outcome === "success"
      )
    ).toBe(true);

    await withRecordingSpan(async (span) => {
      await client.assignments.assign(
        { taskId: task.id, tagId: tag.id },
        invocation("trace-procedure-local")
      );

      expect(span.events.map((event) => event.name)).toEqual([
        "todo.procedure.started",
        "todo.assignments.module.observed",
        "todo.assignments.assign.completed",
        "todo.procedure.succeeded",
      ]);
    });

    expect(
      logs.some(
        (entry) =>
          entry.event === "todo.assignments.module" &&
          entry.payload.layer === "module" &&
          entry.payload.module === "assignments" &&
          entry.payload.path === "assignments.assign" &&
          entry.payload.workspaceId === "workspace-default" &&
          entry.payload.invocationTraceId === "trace-procedure-local"
      )
    ).toBe(true);
    expect(
      analytics.some(
        (entry) =>
          entry.event === "orpc.procedure" &&
          entry.payload.path === "assignments.assign" &&
          entry.payload.analytics_layer === "module" &&
          entry.payload.analytics_module === "assignments" &&
          entry.payload.analytics_path === "assignments.assign" &&
          entry.payload.analytics_outcome === "success" &&
          entry.payload.analytics_workspace_id === "workspace-default" &&
          entry.payload.analytics_trace_id === "trace-procedure-local"
      )
    ).toBe(true);
  });
});
