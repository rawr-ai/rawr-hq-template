import { context as otelContext, type Span, trace } from "@opentelemetry/api";
import { createRouterClient, os } from "@orpc/server";
import { describe, expect, test } from "vitest";
import * as hqSdk from "../../src";
import {
  createAnalyticsMiddlewareCallback,
  createObservabilityMiddlewareCallback,
  procedureMetadata,
} from "../../src";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "../../src/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "../../src/host-adapters/logger/embedded-placeholder";

type TestContext = {
  deps: {
    analytics: ReturnType<typeof createEmbeddedPlaceholderAnalyticsAdapter>;
    logger: ReturnType<typeof createEmbeddedPlaceholderLoggerAdapter>;
  };
};

const metadataDefaults = {
  idempotent: true,
  domain: "fixture",
  audience: "test",
  audit: "basic",
  entity: "service",
} satisfies Parameters<typeof procedureMetadata>[0];

const middlewareBase = os.$context<TestContext>();

describe("native oRPC middleware", () => {
  test("does not republish deleted framework facades", () => {
    expect(hqSdk).toHaveProperty("procedureMetadata");
    expect(hqSdk).toHaveProperty("createAnalyticsMiddlewareCallback");
    expect(hqSdk).toHaveProperty("createObservabilityMiddlewareCallback");

    for (const deletedExport of [
      "createAnalyticsMiddleware",
      "createObservabilityMiddleware",
      "defineService",
      "schema",
      "createContractBuilder",
      "createBaseProvider",
      "createBaseMiddleware",
    ]) {
      expect(hqSdk).not.toHaveProperty(deletedExport);
    }
  });

  test("emits one analytics event and one lifecycle log from one root attachment", async () => {
    const analyticsEntries: Array<{ event: string; payload: Record<string, unknown> }> = [];
    const logEntries: Array<{
      level: "info" | "error";
      event: string;
      payload: Record<string, unknown>;
    }> = [];
    const context: TestContext = {
      deps: {
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      },
    };
    const base = middlewareBase
      .use(middlewareBase.middleware(createObservabilityMiddlewareCallback(metadataDefaults)))
      .use(
        middlewareBase.middleware(
          createAnalyticsMiddlewareCallback(metadataDefaults, {
            payload: ({ meta }) => ({ entity: meta.entity }),
          })
        )
      );
    const router = {
      nested: {
        execute: base
          .meta(procedureMetadata({ idempotent: false, entity: "operation" }))
          .handler(() => "ready"),
      },
    };

    const client = createRouterClient(router, { context });

    await expect(client.nested.execute()).resolves.toBe("ready");
    expect(analyticsEntries).toEqual([
      {
        event: "orpc.procedure",
        payload: {
          app: "fixture",
          path: "nested.execute",
          outcome: "success",
          entity: "operation",
        },
      },
    ]);
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      level: "info",
      event: "fixture.procedure",
      payload: {
        outcome: "success",
        path: "nested.execute",
        domain: "fixture",
        entity: "operation",
        idempotent: false,
      },
    });
  });

  test("keeps analytics delivery failure outside the procedure result", async () => {
    const logEntries: Array<{
      level: "info" | "error";
      event: string;
      payload: Record<string, unknown>;
    }> = [];
    const context: TestContext = {
      deps: {
        analytics: {
          track() {
            throw new Error("receiver unavailable");
          },
        },
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      },
    };
    const router = {
      execute: middlewareBase
        .use(middlewareBase.middleware(createAnalyticsMiddlewareCallback(metadataDefaults)))
        .handler(() => "ready"),
    };

    const client = createRouterClient(router, { context });

    await expect(client.execute()).resolves.toBe("ready");
    expect(logEntries).toEqual([
      {
        level: "error",
        event: "orpc.analytics",
        payload: {
          path: "execute",
          outcome: "success",
          errorMessage: "receiver unavailable",
        },
      },
    ]);
  });

  test("preserves procedure outcomes when analytics and its fallback logger fail", async () => {
    const failure = new Error("domain failure");
    const context: TestContext = {
      deps: {
        analytics: {
          track() {
            throw new Error("receiver unavailable");
          },
        },
        logger: {
          info() {},
          error() {
            throw new Error("logger unavailable");
          },
        },
      },
    };
    const base = middlewareBase.use(
      middlewareBase.middleware(createAnalyticsMiddlewareCallback(metadataDefaults))
    );
    const client = createRouterClient(
      {
        succeed: base.handler(() => "ready"),
        fail: base.handler(() => {
          throw failure;
        }),
      },
      { context }
    );

    await expect(client.succeed()).resolves.toBe("ready");
    await expect(client.fail()).rejects.toBe(failure);
  });

  test("preserves procedure outcomes when observability callbacks fail", async () => {
    const failure = new Error("domain failure");
    const context: TestContext = {
      deps: {
        analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
        logger: {
          info() {
            throw new Error("logger unavailable");
          },
          error() {
            throw new Error("logger unavailable");
          },
        },
      },
    };
    const base = middlewareBase.use(
      middlewareBase.middleware(
        createObservabilityMiddlewareCallback(metadataDefaults, {
          logFields() {
            throw new Error("profile unavailable");
          },
        })
      )
    );
    const client = createRouterClient(
      {
        succeed: base.handler(() => "ready"),
        fail: base.handler(() => {
          throw failure;
        }),
      },
      { context }
    );

    await expect(client.succeed()).resolves.toBe("ready");
    await expect(client.fail()).rejects.toBe(failure);
  });

  test("preserves procedure outcomes when active span mutations fail", async () => {
    const failure = new Error("domain failure");
    const context: TestContext = {
      deps: {
        analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
        logger: createEmbeddedPlaceholderLoggerAdapter(),
      },
    };
    const base = middlewareBase.use(
      middlewareBase.middleware(createObservabilityMiddlewareCallback(metadataDefaults))
    );
    const client = createRouterClient(
      {
        succeed: base.handler(() => "ready"),
        fail: base.handler(() => {
          throw failure;
        }),
      },
      { context }
    );
    const throwingSpan = {
      spanContext: () => ({ traceId: "1".repeat(32), spanId: "2".repeat(16), traceFlags: 1 }),
      setAttributes() {
        throw new Error("span unavailable");
      },
      addEvent() {
        throw new Error("span unavailable");
      },
      recordException() {
        throw new Error("span unavailable");
      },
    } as unknown as Span;
    const activeContext = trace.setSpan(otelContext.active(), throwingSpan);

    await otelContext.with(activeContext, async () => {
      await expect(client.succeed()).resolves.toBe("ready");
      await expect(client.fail()).rejects.toBe(failure);
    });
  });
});
