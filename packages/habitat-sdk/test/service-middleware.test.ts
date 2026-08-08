import {
  type Attributes,
  type AttributeValue,
  type Exception,
  type Link,
  type Span,
  type SpanContext,
  type SpanStatus,
  type TimeInput,
  trace,
} from "@opentelemetry/api";
import { createRouterClient, os } from "@orpc/server";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createAnalyticsMiddlewareCallback,
  createObservabilityMiddlewareCallback,
  procedureMetadata,
} from "../src/service";

type Entry = {
  event: string;
  payload: Record<string, unknown>;
};

type TestContext = {
  marker: string;
  deps: {
    analytics: {
      track(event: string, payload?: Record<string, unknown>): void;
    };
    logger: {
      info(event: string, payload?: Record<string, unknown>): void;
      error(event: string, payload?: Record<string, unknown>): void;
    };
  };
};

const metadataDefaults = {
  idempotent: true,
  domain: "fixture",
  audience: "test",
  entity: "service",
} satisfies Parameters<typeof procedureMetadata>[0];

const middlewareBase = os.$context<TestContext>();

class RecordingSpan implements Span {
  readonly attributes: Attributes = {};

  spanContext(): SpanContext {
    return {
      traceId: "1".repeat(32),
      spanId: "2".repeat(16),
      traceFlags: 1,
    };
  }

  setAttribute(key: string, value: AttributeValue): this {
    this.attributes[key] = value;
    return this;
  }

  setAttributes(attributes: Attributes): this {
    Object.assign(this.attributes, attributes);
    return this;
  }

  addEvent(_name: string, _attributesOrStartTime?: Attributes | TimeInput): this {
    return this;
  }

  addLink(_link: Link): this {
    return this;
  }

  addLinks(_links: Link[]): this {
    return this;
  }

  setStatus(_status: SpanStatus): this {
    return this;
  }

  updateName(_name: string): this {
    return this;
  }

  end(_endTime?: TimeInput): void {}

  isRecording(): boolean {
    return true;
  }

  recordException(_exception: Exception, _time?: TimeInput): void {}
}

describe("Habitat service middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("overlays procedure metadata while preserving the host context", async () => {
    const analyticsEntries: Entry[] = [];
    const logEntries: Entry[] = [];
    const context: TestContext = {
      marker: "host-context",
      deps: {
        analytics: {
          track(event, payload = {}) {
            analyticsEntries.push({ event, payload });
          },
        },
        logger: {
          info(event, payload = {}) {
            logEntries.push({ event, payload });
          },
          error(event, payload = {}) {
            logEntries.push({ event, payload });
          },
        },
      },
    };
    const base = middlewareBase
      .use(
        middlewareBase.middleware(
          createObservabilityMiddlewareCallback(metadataDefaults, {
            logFields: ({ context: current }) => ({ marker: current.marker }),
          })
        )
      )
      .use(
        middlewareBase.middleware(
          createAnalyticsMiddlewareCallback(metadataDefaults, {
            payload: ({ context: current, meta }) => ({
              marker: current.marker,
              entity: meta.entity,
            }),
          })
        )
      );
    const client = createRouterClient(
      {
        nested: {
          execute: base
            .meta(procedureMetadata({ idempotent: false, entity: "operation" }))
            .handler(({ context: current }) => current.marker),
        },
      },
      { context }
    );

    await expect(client.nested.execute()).resolves.toBe("host-context");
    expect(analyticsEntries).toEqual([
      {
        event: "orpc.procedure",
        payload: {
          app: "fixture",
          path: "nested.execute",
          outcome: "success",
          marker: "host-context",
          entity: "operation",
        },
      },
    ]);
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      event: "fixture.procedure",
      payload: {
        outcome: "success",
        path: "nested.execute",
        idempotent: false,
        entity: "operation",
        marker: "host-context",
      },
    });
  });

  test("defaults telemetry attributes to Habitat and accepts a Rawr namespace", async () => {
    const context: TestContext = {
      marker: "service-field",
      deps: {
        analytics: { track() {} },
        logger: { info() {}, error() {} },
      },
    };
    const createClient = (attributeNamespace?: string) => {
      const base = middlewareBase.use(
        middlewareBase.middleware(
          createObservabilityMiddlewareCallback(metadataDefaults, {
            ...(attributeNamespace ? { attributeNamespace } : {}),
            spanAttributes: ({ context: current }) => ({ marker: current.marker }),
          })
        )
      );

      return createRouterClient(
        {
          nested: {
            execute: base.meta(procedureMetadata({ idempotent: false })).handler(() => "ready"),
          },
        },
        { context }
      );
    };
    const activeSpan = vi.spyOn(trace, "getActiveSpan");
    const habitatSpan = new RecordingSpan();
    activeSpan.mockReturnValue(habitatSpan);

    await expect(createClient().nested.execute()).resolves.toBe("ready");
    expect(habitatSpan.attributes).toMatchObject({
      "habitat.orpc.path": "nested.execute",
      "habitat.orpc.idempotent": false,
      "habitat.orpc.domain": "fixture",
      "habitat.orpc.audience": "test",
      "habitat.fixture.marker": "service-field",
    });

    const rawrSpan = new RecordingSpan();
    activeSpan.mockReturnValue(rawrSpan);

    await expect(createClient("rawr").nested.execute()).resolves.toBe("ready");
    expect(rawrSpan.attributes).toMatchObject({
      "rawr.orpc.path": "nested.execute",
      "rawr.orpc.idempotent": false,
      "rawr.orpc.domain": "fixture",
      "rawr.orpc.audience": "test",
      "rawr.fixture.marker": "service-field",
    });
    expect(rawrSpan.attributes).not.toHaveProperty("habitat.orpc.path");
    expect(rawrSpan.attributes).not.toHaveProperty("habitat.fixture.marker");
  });

  test("does not replace either procedure outcome when analytics delivery fails", async () => {
    const failure = new Error("procedure failure");
    const context: TestContext = {
      marker: "host-context",
      deps: {
        analytics: {
          track() {
            throw new Error("analytics unavailable");
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

  test("does not replace either procedure outcome when observability fails", async () => {
    const failure = new Error("procedure failure");
    const context: TestContext = {
      marker: "host-context",
      deps: {
        analytics: { track() {} },
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
            throw new Error("fields unavailable");
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
});
