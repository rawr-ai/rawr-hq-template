import { describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { createCoordinationRuntimeAdapter, registerCoordinationRoutes } from "../src/coordination";
import { registerRawrRoutes } from "../src/rawr";
import { processCoordinationRunEvent } from "@rawr/coordination-inngest";
import type { Inngest } from "inngest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import type { CoordinationWorkflowV1 } from "@rawr/coordination";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("rawr server routes", () => {
  it("does not serve plugin web modules when disabled", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(404);
  });

  it("serves plugin web modules when enabled", async () => {
    const enabled = new Set(["@rawr/plugin-mfe-demo"]);
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: enabled });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
    const text = await res.text();
    expect(text).toContain("mount");
  });

  it("registers an Inngest serve endpoint", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(
      new Request("http://localhost/api/inngest", { method: "GET", headers: { host: "localhost" } }),
    );
    expect(res.status).not.toBe(404);
  });

  it("creates, validates, runs, and returns timeline for coordination workflows", async () => {
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

    const app = registerCoordinationRoutes(createServerApp(), {
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

    const createRes = await app.handle(
      new Request("http://localhost/rawr/coordination/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workflow }),
      }),
    );
    expect(createRes.status).toBe(200);
    const createJson = (await createRes.json()) as any;
    expect(createJson.ok).toBe(true);

    const validateRes = await app.handle(
      new Request("http://localhost/rawr/coordination/workflows/wf-server/validate", { method: "POST" }),
    );
    expect(validateRes.status).toBe(200);
    const validateJson = (await validateRes.json()) as any;
    expect(validateJson.ok).toBe(true);
    expect(validateJson.validation.ok).toBe(true);

    const runRes = await app.handle(
      new Request("http://localhost/rawr/coordination/workflows/wf-server/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: { ticket: "T-100" } }),
      }),
    );
    expect(runRes.status).toBe(200);
    const runJson = (await runRes.json()) as any;
    expect(runJson.ok).toBe(true);
    expect(runJson.run.status).toBe("completed");
    expect(typeof runJson.run.runId).toBe("string");

    const statusRes = await app.handle(new Request(`http://localhost/rawr/coordination/runs/${runJson.run.runId}`));
    expect(statusRes.status).toBe(200);
    const statusJson = (await statusRes.json()) as any;
    expect(statusJson.ok).toBe(true);
    expect(statusJson.run.runId).toBe(runJson.run.runId);

    const timelineRes = await app.handle(
      new Request(`http://localhost/rawr/coordination/runs/${runJson.run.runId}/timeline`),
    );
    expect(timelineRes.status).toBe(200);
    const timelineJson = (await timelineRes.json()) as any;
    expect(timelineJson.ok).toBe(true);
    expect(Array.isArray(timelineJson.timeline)).toBe(true);
    expect(timelineJson.timeline.some((evt: any) => evt.type === "run.started")).toBe(true);
    expect(timelineJson.timeline.some((evt: any) => evt.type === "run.completed")).toBe(true);
  });
});
