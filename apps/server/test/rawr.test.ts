import { describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { createCoordinationRuntimeAdapter } from "../src/coordination";
import { registerOrpcRoutes } from "../src/orpc";
import { PHASE_A_HOST_MOUNT_ORDER, registerRawrRoutes } from "../src/rawr";
import { processCoordinationRunEvent } from "@rawr/coordination-inngest";
import type { Inngest } from "inngest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import type { CoordinationWorkflowV1 } from "@rawr/coordination";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

async function createPluginFixture(input: { dirName: string; pluginId: string }) {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-plugin-"));
  const pluginRoot = path.join(fixtureRoot, "plugins", "web", input.dirName);

  await fs.mkdir(path.join(pluginRoot, "dist"), { recursive: true });
  await fs.writeFile(
    path.join(pluginRoot, "package.json"),
    JSON.stringify({ name: input.pluginId, private: true }, null, 2),
    "utf8",
  );
  await fs.writeFile(path.join(pluginRoot, "dist", "web.js"), "export function mount() { return { unmount() {} }; }", "utf8");

  return fixtureRoot;
}

describe("rawr server routes", () => {
  it("does not serve plugin web modules when disabled", async () => {
    const fixtureRoot = await createPluginFixture({
      dirName: "mfe-demo",
      pluginId: "@rawr/plugin-mfe-demo",
    });
    const app = registerRawrRoutes(createServerApp(), { repoRoot: fixtureRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(404);
  });

  it("serves plugin web modules when enabled", async () => {
    const fixtureRoot = await createPluginFixture({
      dirName: "mfe-demo",
      pluginId: "@rawr/plugin-mfe-demo",
    });

    const enabled = new Set(["@rawr/plugin-mfe-demo"]);
    const app = registerRawrRoutes(createServerApp(), { repoRoot: fixtureRoot, enabledPluginIds: enabled });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
    const text = await res.text();
    expect(text).toContain("mount");
  });

  it("host-composition-guard: rejects unsigned ingress before runtime dispatch", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(
      new Request("http://localhost/api/inngest", { method: "GET", headers: { host: "localhost" } }),
    );
    expect(res.status).toBe(403);
  });

  it("host-composition-guard: enforces ingress -> workflows -> rpc/openapi mount order contract", () => {
    expect(PHASE_A_HOST_MOUNT_ORDER).toEqual(["/api/inngest", "/api/workflows/*", "/rpc + /api/orpc/*"]);
  });

  it("creates, validates, runs, and returns timeline through ORPC RPC handlers", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-coord-"));
    const runtime = createCoordinationRuntimeAdapter({
      repoRoot: tempRoot,
      inngestBaseUrl: "http://localhost:8288",
    });

    const fakeInngest = {
      send: async (payload: any) => {
        const eventId = `evt-${Date.now()}`;
        const stepMemo = new Map<string, unknown>();
        await processCoordinationRunEvent({
          payload: payload.data,
          runtime,
          inngestRunId: "inngest-local-run",
          inngestEventId: eventId,
          step: {
            run: async <T,>(id: string, fn: () => Promise<T>) => {
              if (stepMemo.has(id)) {
                return stepMemo.get(id) as T;
              }
              const value = await fn();
              stepMemo.set(id, value);
              return value;
            },
          },
        });
        return { ids: [eventId] };
      },
    } as unknown as Inngest;

    const app = registerOrpcRoutes(createServerApp(), {
      repoRoot: tempRoot,
      baseUrl: "http://localhost:3000",
      inngestClient: fakeInngest,
      runtime,
    });

    const workflow: CoordinationWorkflowV1 = {
      workflowId: "wf-server",
      version: 1,
      name: "Server workflow",
      entryDeskId: "desk-a",
      desks: [
        {
          deskId: "desk-a",
          kind: "desk:analysis",
          name: "Desk A",
          responsibility: "Analyze",
          domain: "coord",
          inputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
          outputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
          memoryScope: { persist: true },
        },
        {
          deskId: "desk-b",
          kind: "desk:execution",
          name: "Desk B",
          responsibility: "Execute",
          domain: "coord",
          inputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
          outputSchema: { type: "object", properties: { done: { type: "boolean" } }, required: ["done"] },
          memoryScope: { persist: false },
        },
      ],
      handoffs: [{ handoffId: "h1", fromDeskId: "desk-a", toDeskId: "desk-b" }],
    };

    const saveRes = await app.handle(
      new Request("http://localhost/rpc/coordination/saveWorkflow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { workflow } }),
      }),
    );
    expect(saveRes.status).toBe(200);
    const saveJson = (await saveRes.json()) as { json?: { workflow?: { workflowId?: string } } };
    expect(saveJson.json?.workflow?.workflowId).toBe("wf-server");

    const validateRes = await app.handle(
      new Request("http://localhost/rpc/coordination/validateWorkflow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { workflowId: "wf-server" } }),
      }),
    );
    expect(validateRes.status).toBe(200);
    const validateJson = (await validateRes.json()) as {
      json?: { validation?: { ok?: boolean } };
    };
    expect(validateJson.json?.validation?.ok).toBe(true);

    const runRes = await app.handle(
      new Request("http://localhost/rpc/coordination/queueRun", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { workflowId: "wf-server", input: { ticket: "T-100" } } }),
      }),
    );
    expect(runRes.status).toBe(200);
    const runJson = (await runRes.json()) as {
      json?: { run?: { runId?: string; status?: string }; eventIds?: string[] };
    };
    expect(runJson.json?.run?.status).toBe("completed");
    expect(typeof runJson.json?.run?.runId).toBe("string");

    const runId = runJson.json?.run?.runId as string;
    const statusRes = await app.handle(
      new Request("http://localhost/rpc/coordination/getRunStatus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { runId } }),
      }),
    );
    expect(statusRes.status).toBe(200);
    const statusJson = (await statusRes.json()) as { json?: { run?: { runId?: string } } };
    expect(statusJson.json?.run?.runId).toBe(runId);

    const timelineRes = await app.handle(
      new Request("http://localhost/rpc/coordination/getRunTimeline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { runId } }),
      }),
    );
    expect(timelineRes.status).toBe(200);
    const timelineJson = (await timelineRes.json()) as {
      json?: { timeline?: Array<{ type?: string }> };
    };
    const timeline = timelineJson.json?.timeline ?? [];
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.some((evt) => evt.type === "run.started")).toBe(true);
    expect(timeline.some((evt) => evt.type === "run.completed")).toBe(true);
  });

  it("returns ORPC-typed errors for invalid procedure requests", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-coord-errors-"));
    const runtime = createCoordinationRuntimeAdapter({
      repoRoot: tempRoot,
      inngestBaseUrl: "http://localhost:8288",
    });

    const fakeInngest = {
      send: async () => ({ ids: ["evt-test-1"] }),
    } as unknown as Inngest;

    const app = registerOrpcRoutes(createServerApp(), {
      repoRoot: tempRoot,
      baseUrl: "http://localhost:3000",
      inngestClient: fakeInngest,
      runtime,
    });

    const invalidWorkflowIdRes = await app.handle(
      new Request("http://localhost/rpc/coordination/getWorkflow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { workflowId: "invalid id" } }),
      }),
    );
    expect(invalidWorkflowIdRes.status).toBe(400);
    const invalidWorkflowIdJson = (await invalidWorkflowIdRes.json()) as {
      json?: { code?: string };
    };
    expect(invalidWorkflowIdJson.json?.code).toBe("INVALID_WORKFLOW_ID");

    const missingRunRes = await app.handle(
      new Request("http://localhost/rpc/coordination/getRunStatus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { runId: "run-missing" } }),
      }),
    );
    expect(missingRunRes.status).toBe(404);
    const missingRunJson = (await missingRunRes.json()) as {
      json?: { code?: string; status?: number };
    };
    expect(missingRunJson.json?.code).toBe("RUN_NOT_FOUND");
    expect(missingRunJson.json?.status).toBe(404);
  });

  it("host-composition-guard: request scoped context factory runs per ORPC request", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-server-coord-context-"));
    const runtime = createCoordinationRuntimeAdapter({
      repoRoot: tempRoot,
      inngestBaseUrl: "http://localhost:8288",
    });
    const fakeInngest = {
      send: async () => ({ ids: ["evt-test-1"] }),
    } as unknown as Inngest;

    const requestIds: string[] = [];
    const app = registerOrpcRoutes(createServerApp(), {
      repoRoot: tempRoot,
      baseUrl: "http://localhost:3000",
      inngestClient: fakeInngest,
      runtime,
      onContextCreated: (context) => {
        requestIds.push(context.requestId);
      },
    });

    const first = await app.handle(
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": "req-a" },
        body: JSON.stringify({ json: {} }),
      }),
    );
    expect(first.status).toBe(200);

    const second = await app.handle(
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": "req-b" },
        body: JSON.stringify({ json: {} }),
      }),
    );
    expect(second.status).toBe(200);

    expect(requestIds).toEqual(["req-a", "req-b"]);
  });
});
