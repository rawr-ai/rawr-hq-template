import { context, trace, type Attributes, type Context, type Span, type SpanContext, type SpanStatus } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { describe, expect, it } from "vitest";
import { createRouterClient, safe } from "@orpc/server";
import { Type } from "typebox";

import { createClient } from "../src";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "../src/orpc/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "../src/orpc/host-adapters/logger/embedded-placeholder";
import {
  createClientOptions,
  invocation,
  type AnalyticsEntry,
  type LogEntry,
} from "./helpers";
import {
  defineService,
  schema,
} from "../src/orpc-sdk";

function createBaselineDeps(
  logs: LogEntry[],
  analytics: AnalyticsEntry[],
) {
  return {
    logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logs }),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analytics }),
  };
}

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
        "todo.tags.module.observed",
      ]));
    });

    expect(logs.some((entry) => entry.event === "orpc.procedure" && entry.payload.outcome === "success")).toBe(true);
    expect(logs.some((entry) => entry.event === "todo.procedure" && entry.payload.outcome === "success")).toBe(true);
    expect(logs.some((entry) =>
      entry.event === "todo.tags.module"
      && entry.payload.layer === "module"
      && entry.payload.path === "tags.list")).toBe(true);
    expect(logs.some((entry) => entry.payload.spanTraceId === "1234567890abcdef1234567890abcdef")).toBe(true);
    expect(analytics.some((entry) => entry.event === "orpc.procedure" && entry.payload.path === "tags.list")).toBe(true);
    expect(analytics.some((entry) =>
      entry.event === "orpc.procedure"
      && entry.payload.path === "tags.list"
      && entry.payload.analytics_layer === "module"
      && entry.payload.analytics_module === "tags"
      && entry.payload.analytics_path === "tags.list"
      && entry.payload.analytics_outcome === "success")).toBe(true);
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

  it("adds procedure-local observability and analytics on top of the service baseline", async () => {
    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({ logs, analytics }));

    const task = await client.tasks.create({ title: "Procedure-local example" }, invocation("trace-seed-task"));
    const tag = await client.tags.create({ name: "proc-local", color: "#336699" }, invocation("trace-seed-tag"));

    await withRecordingSpan(async (span) => {
      await client.assignments.assign(
        { taskId: task.id, tagId: tag.id },
        invocation("trace-procedure-local"),
      );

      expect(span.events.map((event) => event.name)).toEqual(expect.arrayContaining([
        "todo.procedure.started",
        "todo.procedure.succeeded",
        "todo.assignments.assign.requested",
      ]));
    });

    expect(logs.some((entry) =>
      entry.event === "todo.assignments.assign.requested"
      && entry.payload.layer === "procedure"
      && entry.payload.procedure === "assignments.assign"
      && entry.payload.workspaceId === "workspace-default"
      && entry.payload.invocationTraceId === "trace-procedure-local")).toBe(true);
    expect(analytics.some((entry) =>
      entry.event === "orpc.procedure"
      && entry.payload.path === "assignments.assign"
      && entry.payload.analytics_layer === "procedure"
      && entry.payload.analytics_procedure === "assignments.assign"
      && entry.payload.analytics_outcome === "success"
      && entry.payload.analytics_workspace_id === "workspace-default"
      && entry.payload.analytics_trace_id === "trace-procedure-local")).toBe(true);
  });

  it("exposes additive service-local builders without duplicating the baseline lifecycle shell", async () => {
    type TestService = {
      initialContext: {
        deps: {
          logger: {
            info(message: string, meta?: Record<string, unknown>): void;
            error(message: string, meta?: Record<string, unknown>): void;
          };
          analytics: {
            track(event: string, payload?: Record<string, unknown>): void | Promise<void>;
          };
        };
        scope: {
          workspaceId: string;
        };
        config: {
          readOnly: boolean;
        };
      };
      invocationContext: {
        traceId: string;
      };
      metadata: {};
    };

    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const service = defineService<TestService>({
      metadataDefaults: {
        idempotent: true,
        domain: "todo",
      },
      baseline: {
        policy: { events: {} },
      },
    });

    const contract = {
      ping: service.oc
        .input(schema(Type.Object({}, { additionalProperties: false })))
        .output(schema(Type.Object({
          ok: Type.Boolean(),
        }, { additionalProperties: false }))),
    };

    const requiredExtensions = {
      observability: service.createRequiredObservabilityMiddleware({}),
      analytics: service.createRequiredAnalyticsMiddleware({}),
    };
    const localObservability = service.createObservabilityMiddleware({
      spanAttributes: ({ context }) => ({
        module: "ping",
        workspace_id: context.scope.workspaceId,
      }),
      onStart: ({ span, pathLabel }) => {
        span?.addEvent("todo.local.started", { path: pathLabel });
      },
      onSuccess: ({ span, durationMs }) => {
        span?.addEvent("todo.local.succeeded", { durationMs });
      },
    });
    const localAnalytics = service.createAnalyticsMiddleware({
      payload: ({ context }) => ({
        module: "ping",
        workspaceId: context.scope.workspaceId,
        local: true,
      }),
    });

    const os = service.createImplementer(contract, requiredExtensions)
      .use(localObservability)
      .use(localAnalytics);
    const ping = os.ping.handler(async () => ({ ok: true }));
    const router = os.router({ ping });
    const client = createRouterClient(router, {
      context: {
        deps: {
          ...createBaselineDeps(logs, analytics),
        },
        scope: {
          workspaceId: "workspace-local",
        },
        config: {
          readOnly: false,
        },
        invocation: {
          traceId: "trace-local",
        },
        provided: {},
      },
    });

    await withRecordingSpan(async (span) => {
      await client.ping({});

      expect(span.attributes["rawr.todo.module"]).toBe("ping");
      expect(span.attributes["rawr.todo.workspace_id"]).toBe("workspace-local");
      expect(span.events.filter((event) => event.name === "todo.procedure.started")).toHaveLength(1);
      expect(span.events.filter((event) => event.name === "todo.procedure.succeeded")).toHaveLength(1);
      expect(span.events.map((event) => event.name)).toEqual(expect.arrayContaining([
        "rawr.orpc.procedure.started",
        "rawr.orpc.procedure.succeeded",
        "todo.procedure.started",
        "todo.procedure.succeeded",
        "todo.local.started",
        "todo.local.succeeded",
      ]));
    });

    expect(logs.some((entry) => entry.event === "todo.procedure" && entry.payload.outcome === "success")).toBe(true);
    expect(analytics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event: "orpc.procedure",
        payload: expect.objectContaining({
          app: "todo",
          path: "ping",
          outcome: "success",
          module: "ping",
          workspaceId: "workspace-local",
          local: true,
        }),
      }),
    ]));
  });
});
