import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { EmitTechnicalLogInput, TelemetryResource } from "@habitat-ai/resource-telemetry";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { createRawrHostComposition } from "../src/host-composition";
import {
  __configureHostLoggerForTests,
  __flushHostLoggerForTests,
  __resetHostLoggerForTests,
  createHostLoggerAdapter,
  createHostLoggingContext,
  withHostLoggingContext,
} from "../src/logging";
import { registerRawrRoutes } from "../src/rawr";
import { createTestingRawrHostSeam } from "../src/testing-host";
import { createTestingServerProcessRuntime } from "./support/process-runtime";

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

const EXTERNAL_API_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "external",
} as const;

type LoggedLine = Record<string, unknown>;

async function createTestApp(telemetryResource?: TelemetryResource) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-logging-"));
  const processRuntime = createTestingServerProcessRuntime();
  const telemetry =
    telemetryResource === undefined
      ? processRuntime.telemetry
      : Object.freeze({ ...processRuntime.telemetry, telemetry: telemetryResource });
  const hostLogger = createHostLoggerAdapter(telemetry.telemetry);
  const app = registerRawrRoutes(createServerApp(), {
    inngestClient: processRuntime.inngestClient,
    telemetry,
    repoRoot,
    baseUrl: "http://localhost:3000",
    hostComposition: createRawrHostComposition({
      declarations: createTestingRawrHostSeam().declarations,
      hostLogger,
    }),
  });

  return { app, repoRoot };
}

function createTechnicalLogTelemetry(
  onEmit: (input: EmitTechnicalLogInput) => void
): TelemetryResource {
  return Object.freeze({
    processIdentity: Object.freeze({
      serviceName: "rawr-hq-test",
      processRole: "server-test",
      processInstanceId: "server-test-technical-log",
    }),
    availability: "available",
    beginNativeOperation: () =>
      Effect.succeed(
        Object.freeze({
          enrich: () => Effect.void,
          finish: () => Effect.void,
        })
      ),
    emitTechnicalLog: (input: EmitTechnicalLogInput) => Effect.sync(() => onEmit(input)),
    readDiagnostics: () => Effect.succeed(Object.freeze([])),
    flush: () =>
      Effect.succeed(Object.freeze({ outcome: "flushed", diagnostics: Object.freeze([]) })),
  });
}

async function readRuntimeLogs(repoRoot: string): Promise<LoggedLine[]> {
  const logFile = path.join(repoRoot, ".rawr", "hq", "runtime.log");
  const raw = await fs.readFile(logFile, "utf8");

  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LoggedLine);
}

beforeEach(() => {
  __resetHostLoggerForTests();
});

afterEach(() => {
  __resetHostLoggerForTests();
});

describe("host logging correlation", () => {
  it("preserves the Pino record before emitting one separate bounded technical log", async () => {
    const order: string[] = [];
    const pinoLines: string[] = [];
    const technicalLogs: EmitTechnicalLogInput[] = [];
    __configureHostLoggerForTests({
      destination: {
        write(line: string) {
          order.push("pino");
          pinoLines.push(line);
        },
      },
    });
    const telemetry = createTechnicalLogTelemetry((input) => {
      order.push("telemetry");
      technicalLogs.push(input);
    });
    const logger = createHostLoggerAdapter(telemetry);
    const request = new Request("http://localhost/api/workflows/exampleTodo/runtime?secret=yes", {
      method: "POST",
      headers: { "x-rawr-caller-surface": "first-party" },
    });

    await withHostLoggingContext(
      createHostLoggingContext({
        request,
        repoRoot: "/tmp/rawr-host-technical-log",
        requestId: "request-technical-1",
        correlationId: "correlation-technical-1",
        surface: "workflow",
      }),
      async () => {
        logger.info("workflow.route", {
          outcome: "success",
          statusCode: 202,
          durationMs: 17,
          secret: "pino-only",
          payload: { private: true },
          traceId: "caller-authored-trace",
        });
      }
    );

    expect(order).toEqual(["pino", "telemetry"]);
    expect(pinoLines).toHaveLength(1);
    expect(JSON.parse(pinoLines[0] ?? "{}")).toMatchObject({
      event: "workflow.route",
      message: "workflow.route",
      outcome: "success",
      statusCode: 202,
      durationMs: 17,
      secret: "pino-only",
      payload: { private: true },
      traceId: "caller-authored-trace",
      requestId: "request-technical-1",
      correlationId: "correlation-technical-1",
      requestMethod: "POST",
      requestPath: "/api/workflows/exampleTodo/runtime",
      surface: "workflow",
      callerSurface: "first-party",
    });
    expect(technicalLogs).toEqual([
      {
        severity: "info",
        eventName: "workflow.route",
        message: "workflow.route",
        attributes: {
          "request.id": "request-technical-1",
          "correlation.id": "correlation-technical-1",
          "request.method": "POST",
          "request.path": "/api/workflows/exampleTodo/runtime",
          "http.response.status_code": 202,
          "duration.ms": 17,
        },
      },
    ]);
  });

  it("routes workflow logs through the composition-bound telemetry resource", async () => {
    const technicalLogs: EmitTechnicalLogInput[] = [];
    const { app, repoRoot } = await createTestApp(
      createTechnicalLogTelemetry((input) => technicalLogs.push(input))
    );

    try {
      const response = await app.handle(
        new Request("http://localhost/api/workflows/exampleTodo/missing", {
          headers: {
            "x-request-id": "workflow-request-1",
            "x-correlation-id": "workflow-correlation-1",
          },
        })
      );

      expect(response.status).toBe(404);
      expect(technicalLogs).toContainEqual({
        severity: "info",
        eventName: "workflow.route",
        message: "workflow.route",
        attributes: {
          "request.id": "workflow-request-1",
          "correlation.id": "workflow-correlation-1",
          "request.method": "GET",
          "request.path": "/api/workflows/exampleTodo/missing",
          "http.response.status_code": 404,
          "duration.ms": expect.any(Number),
        },
      });
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("keeps telemetry defects from changing the synchronous Pino result", async () => {
    const pinoLines: string[] = [];
    __configureHostLoggerForTests({
      destination: {
        write(line: string) {
          pinoLines.push(line);
        },
      },
    });
    const logger = createHostLoggerAdapter(
      createTechnicalLogTelemetry(() => {
        throw new Error("technical log defect");
      })
    );
    const request = new Request("http://localhost/rpc/exampleTodo/tasks/create", {
      method: "POST",
    });

    await expect(
      withHostLoggingContext(
        createHostLoggingContext({
          request,
          repoRoot: "/tmp/rawr-host-technical-log-failure",
          requestId: "request-failure-1",
          correlationId: "correlation-failure-1",
          surface: "rpc",
        }),
        async () => {
          logger.error("todo.procedure", { outcome: "error", durationMs: 9 });
        }
      )
    ).resolves.toBeUndefined();

    expect(pinoLines).toHaveLength(1);
    expect(JSON.parse(pinoLines[0] ?? "{}")).toMatchObject({
      level: 50,
      event: "todo.procedure",
      message: "todo.procedure",
      outcome: "error",
      durationMs: 9,
      requestId: "request-failure-1",
      correlationId: "correlation-failure-1",
    });
  });

  it("keeps overlapping RPC correlation pairs request-owned", async () => {
    const { app, repoRoot } = await createTestApp();

    try {
      const requests = [
        new Request("http://localhost/rpc/exampleTodo/tasks/create", {
          method: "POST",
          headers: {
            ...FIRST_PARTY_RPC_HEADERS,
            "x-request-id": "rpc-request-1",
            "x-correlation-id": "rpc-correlation-1",
          },
          body: JSON.stringify({
            json: {
              title: "RPC correlated log",
            },
          }),
        }),
        new Request("http://localhost/rpc/exampleTodo/tasks/create", {
          method: "POST",
          headers: {
            ...FIRST_PARTY_RPC_HEADERS,
            "x-request-id": "rpc-request-2",
            "x-correlation-id": "rpc-correlation-2",
          },
          body: JSON.stringify({
            json: {
              title: "Second RPC correlated log",
            },
          }),
        }),
      ];
      const responses = await Promise.all(requests.map((request) => app.handle(request)));

      expect(responses.map((response) => response.status)).toEqual([200, 200]);

      __flushHostLoggerForTests();

      const entries = await readRuntimeLogs(repoRoot);
      expect(entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "todo.procedure",
            requestId: "rpc-request-1",
            correlationId: "rpc-correlation-1",
            invocationCorrelationId: "rpc-correlation-1",
            requestMethod: "POST",
            requestPath: "/rpc/exampleTodo/tasks/create",
            surface: "rpc",
            callerSurface: "first-party",
          }),
          expect.objectContaining({
            event: "todo.procedure",
            requestId: "rpc-request-2",
            correlationId: "rpc-correlation-2",
            invocationCorrelationId: "rpc-correlation-2",
            requestMethod: "POST",
            requestPath: "/rpc/exampleTodo/tasks/create",
            surface: "rpc",
            callerSurface: "first-party",
          }),
        ])
      );
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("writes correlated openapi service logs into .rawr/hq/runtime.log", async () => {
    const { app, repoRoot } = await createTestApp();

    try {
      const response = await app.handle(
        new Request("http://localhost/api/orpc/exampleTodo/tasks/create", {
          method: "POST",
          headers: {
            ...EXTERNAL_API_HEADERS,
            "x-request-id": "openapi-request-1",
            "x-correlation-id": "openapi-correlation-1",
          },
          body: JSON.stringify({
            title: "OpenAPI correlated log",
          }),
        })
      );

      expect(response.status).toBe(200);

      __flushHostLoggerForTests();

      const entries = await readRuntimeLogs(repoRoot);
      expect(entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "todo.procedure",
            requestId: "openapi-request-1",
            correlationId: "openapi-correlation-1",
            invocationCorrelationId: "openapi-correlation-1",
            requestMethod: "POST",
            requestPath: "/api/orpc/exampleTodo/tasks/create",
            surface: "openapi",
            callerSurface: "external",
          }),
        ])
      );
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });
});
