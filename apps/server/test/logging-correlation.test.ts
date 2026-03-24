import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RUN_FINALIZATION_CONTRACT_V1 } from "@rawr/coordination";
import { saveRunStatus } from "@rawr/coordination/node";
import { createServerApp } from "../src/app";
import { __flushHostLoggerForTests, __resetHostLoggerForTests } from "../src/logging";
import { registerRawrRoutes } from "../src/rawr";

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

async function createTestApp() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-logging-"));
  const app = registerRawrRoutes(createServerApp(), {
    repoRoot,
    enabledPluginIds: new Set(),
    baseUrl: "http://localhost:3000",
  });

  return { app, repoRoot };
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
  it("writes correlated rpc service logs into .rawr/hq/runtime.log", async () => {
    const { app, repoRoot } = await createTestApp();

    try {
      const response = await app.handle(
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
      );

      expect(response.status).toBe(200);

      __flushHostLoggerForTests();

      const entries = await readRuntimeLogs(repoRoot);
      expect(entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "todo.procedure",
          requestId: "rpc-request-1",
          correlationId: "rpc-correlation-1",
          requestMethod: "POST",
          requestPath: "/rpc/exampleTodo/tasks/create",
          surface: "rpc",
          callerSurface: "first-party",
        }),
      ]));
      const entry = entries.find((candidate) => candidate.event === "todo.procedure" && candidate.requestId === "rpc-request-1");
      expect(entry?.traceId).toEqual(expect.any(String));
      expect(entry?.spanId).toEqual(expect.any(String));
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
        }),
      );

      expect(response.status).toBe(200);

      __flushHostLoggerForTests();

      const entries = await readRuntimeLogs(repoRoot);
      expect(entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "todo.procedure",
          requestId: "openapi-request-1",
          correlationId: "openapi-correlation-1",
          requestMethod: "POST",
          requestPath: "/api/orpc/exampleTodo/tasks/create",
          surface: "openapi",
          callerSurface: "external",
        }),
      ]));
      const entry = entries.find((candidate) => candidate.event === "todo.procedure" && candidate.requestId === "openapi-request-1");
      expect(entry?.traceId).toEqual(expect.any(String));
      expect(entry?.spanId).toEqual(expect.any(String));
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("writes correlated coordination authoring logs into .rawr/hq/runtime.log", async () => {
    const { app, repoRoot } = await createTestApp();

    try {
      const response = await app.handle(
        new Request("http://localhost/rpc/coordination/listWorkflows", {
          method: "POST",
          headers: {
            ...FIRST_PARTY_RPC_HEADERS,
            "x-request-id": "coordination-authoring-request-1",
            "x-correlation-id": "coordination-authoring-correlation-1",
          },
          body: JSON.stringify({ json: {} }),
        }),
      );

      expect(response.status).toBe(200);

      __flushHostLoggerForTests();

      const entries = await readRuntimeLogs(repoRoot);
      expect(entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "coordination.procedure",
          requestId: "coordination-authoring-request-1",
          correlationId: "coordination-authoring-correlation-1",
          requestMethod: "POST",
          requestPath: "/rpc/coordination/listWorkflows",
          surface: "rpc",
          callerSurface: "first-party",
        }),
      ]));
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("writes correlated coordination workflow projection logs into .rawr/hq/runtime.log", async () => {
    const { app, repoRoot } = await createTestApp();

    try {
      await saveRunStatus(repoRoot, {
        runId: "run-log-proof",
        workflowId: "wf-log-proof",
        workflowVersion: 1,
        status: "completed",
        startedAt: "2026-03-24T00:00:00.000Z",
        finishedAt: "2026-03-24T00:00:01.000Z",
        input: { ticket: "T-1" },
        output: { ok: true },
        traceLinks: [],
        finalization: {
          contract: RUN_FINALIZATION_CONTRACT_V1,
        },
      });

      const response = await app.handle(
        new Request("http://localhost/rpc/coordination/getRunStatus", {
          method: "POST",
          headers: {
            ...FIRST_PARTY_RPC_HEADERS,
            "x-request-id": "coordination-run-request-1",
            "x-correlation-id": "coordination-run-correlation-1",
          },
          body: JSON.stringify({ json: { runId: "run-log-proof" } }),
        }),
      );

      expect(response.status).toBe(200);

      __flushHostLoggerForTests();

      const entries = await readRuntimeLogs(repoRoot);
      expect(entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "coordination.procedure",
          requestId: "coordination-run-request-1",
          correlationId: "coordination-run-correlation-1",
          requestMethod: "POST",
          requestPath: "/rpc/coordination/getRunStatus",
          surface: "rpc",
          callerSurface: "first-party",
        }),
      ]));
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("writes correlated published workflow host logs into .rawr/hq/runtime.log", async () => {
    const { app, repoRoot } = await createTestApp();

    try {
      const response = await app.handle(
        new Request("http://localhost/api/workflows/support-example/triage/status", {
          headers: {
            "x-request-id": "workflow-request-1",
            "x-correlation-id": "workflow-correlation-1",
          },
        }),
      );

      expect(response.status).toBe(200);

      __flushHostLoggerForTests();

      const entries = await readRuntimeLogs(repoRoot);
      expect(entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "workflow.route",
          requestId: "workflow-request-1",
          correlationId: "workflow-correlation-1",
          requestMethod: "GET",
          requestPath: "/api/workflows/support-example/triage/status",
          surface: "workflow",
          outcome: "success",
          statusCode: 200,
        }),
      ]));
      const entry = entries.find((candidate) => candidate.event === "workflow.route" && candidate.requestId === "workflow-request-1");
      expect(entry?.traceId).toEqual(expect.any(String));
      expect(entry?.spanId).toEqual(expect.any(String));
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });
});
