import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRouterClient } from "@orpc/server";
import {
  fromWorkflowKitWorkflow,
  toWorkflowKitWorkflow,
} from "@rawr/plugin-workflows-coordination/browser";
import {
  compileWorkflowToInngest,
  createCoordinationWorkflowRouter,
  createCoordinationWorkflowRuntimeAdapter,
  processCoordinationRunEvent,
  queueCoordinationRunWithInngest,
  type CoordinationWorkflowContext,
  type CoordinationRuntimeAdapter,
} from "@rawr/plugin-workflows-coordination/server";
import { createClient as createCoordinationClient, type CoordinationWorkflowV1, type DeskRunEventV1, type RunStatusV1 } from "@rawr/coordination";
import { ensureCoordinationStorage, getRunTimeline, saveWorkflow } from "@rawr/coordination/node";
import type { Inngest } from "inngest";

const workflow: CoordinationWorkflowV1 = {
  workflowId: "wf-test",
  version: 1,
  name: "Coord test",
  entryDeskId: "desk-a",
  desks: [
    {
      deskId: "desk-a",
      kind: "desk:analysis",
      name: "A",
      responsibility: "Analyze",
      domain: "ops",
      inputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
      outputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
      memoryScope: { persist: true },
    },
    {
      deskId: "desk-b",
      kind: "desk:execution",
      name: "B",
      responsibility: "Execute",
      domain: "ops",
      inputSchema: { type: "object", properties: { ticket: { type: "string" } }, required: ["ticket"] },
      outputSchema: { type: "object", properties: { done: { type: "boolean" } }, required: ["done"] },
      memoryScope: { persist: false },
    },
  ],
  handoffs: [{ handoffId: "h1", fromDeskId: "desk-a", toDeskId: "desk-b" }],
};

function createRuntimeMock() {
  const statuses = new Map<string, RunStatusV1>();
  const timelines = new Map<string, DeskRunEventV1[]>();
  const memoryWrites = new Map<string, unknown>();

  const runtime: CoordinationRuntimeAdapter = {
    readMemory: async (_workflow, deskId) => ({ deskId, previous: true }),
    writeMemory: async (_workflow, desk, value) => {
      memoryWrites.set(desk.deskId, value);
    },
    getRunStatus: async (runId) => statuses.get(runId) ?? null,
    getRunTimeline: async (runId) => timelines.get(runId) ?? [],
    saveRunStatus: async (run) => {
      statuses.set(run.runId, run);
    },
    appendTimeline: async (runId, event) => {
      const existing = timelines.get(runId) ?? [];
      existing.push(event);
      timelines.set(runId, existing);
    },
    inngestBaseUrl: "http://localhost:8288",
  };

  return { runtime, statuses, timelines, memoryWrites };
}

const noopLogger = {
  info() {},
  error() {},
} as const;

const noopAnalytics = {
  track() {},
} as const;

function resolveCoordinationAuthoringClient(repoRoot: string) {
  return createCoordinationClient({
    deps: {
      logger: noopLogger,
      analytics: noopAnalytics,
    },
    scope: {
      repoRoot,
    },
    config: {},
  }).workflows;
}

describe("coordination workflow inngest runtime", () => {
  it("compiles workflow actions and edges", () => {
    const compiled = compileWorkflowToInngest(workflow);
    expect(compiled.actions.map((action) => action.id)).toEqual(["desk-a", "desk-b"]);
    expect(compiled.edges).toEqual([{ from: "desk-a", to: "desk-b", condition: undefined }]);
  });

  it("converts to/from workflow-kit workflow shape", () => {
    const workflowKit = toWorkflowKitWorkflow(workflow);
    expect(workflowKit.edges.some((edge) => edge.from === "$source" && edge.to === workflow.entryDeskId)).toBe(true);

    const roundTripped = fromWorkflowKitWorkflow({
      workflow: workflowKit,
      baseWorkflow: workflow,
    });

    expect(roundTripped.workflowId).toBe(workflow.workflowId);
    expect(roundTripped.desks).toHaveLength(workflow.desks.length);
    expect(roundTripped.handoffs).toHaveLength(workflow.handoffs.length);
  });

  it("queues runs and then processes them with workflow-kit engine execution", async () => {
    const { runtime, statuses, timelines, memoryWrites } = createRuntimeMock();
    const client = {
      send: async () => ({ ids: ["evt-inngest-1"] }),
    } as unknown as Inngest;

    const queued = await queueCoordinationRunWithInngest({
      client,
      runtime,
      workflow,
      runId: "run-1",
      input: { ticket: "T-100" },
      baseUrl: "http://localhost:3000",
    });

    expect(queued.run.status).toBe("queued");
    expect(queued.eventIds).toEqual(["evt-inngest-1"]);
    expect(queued.run.traceLinks.some((link) => link.url.includes("evt-inngest-1"))).toBe(true);

    const stepMemo = new Map<string, unknown>();
    await processCoordinationRunEvent({
      payload: {
        runId: "run-1",
        workflow,
        input: { ticket: "T-100" },
        baseUrl: "http://localhost:3000",
      },
      runtime,
      inngestRunId: "inngest-run-1",
      inngestEventId: "evt-inngest-1",
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

    const finalStatus = statuses.get("run-1");
    expect(finalStatus?.status).toBe("completed");
    expect(finalStatus?.traceLinks.some((link) => link.url.includes("inngest-run-1"))).toBe(true);

    const runTimeline = timelines.get("run-1") ?? [];
    expect(runTimeline.some((event) => event.type === "run.started" && event.status === "running")).toBe(true);
    expect(runTimeline.some((event) => event.type === "desk.started" && event.deskId === "desk-a")).toBe(true);
    expect(runTimeline.some((event) => event.type === "desk.completed" && event.deskId === "desk-b")).toBe(true);
    expect(runTimeline.some((event) => event.type === "run.completed")).toBe(true);

    expect(memoryWrites.has("desk-a")).toBe(true);
  });

  it("serializes concurrent queue requests for the same runId", async () => {
    const { runtime } = createRuntimeMock();
    let sendCalls = 0;
    const client = {
      send: async () => {
        sendCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 25));
        return { ids: [`evt-${sendCalls}`] };
      },
    } as unknown as Inngest;

    const [first, second] = await Promise.all([
      queueCoordinationRunWithInngest({
        client,
        runtime,
        workflow,
        runId: "run-concurrent",
        input: { ticket: "T-200" },
        baseUrl: "http://localhost:3000",
      }),
      queueCoordinationRunWithInngest({
        client,
        runtime,
        workflow,
        runId: "run-concurrent",
        input: { ticket: "T-200" },
        baseUrl: "http://localhost:3000",
      }),
    ]);

    expect(sendCalls).toBe(1);
    expect(first.eventIds.length).toBe(1);
    expect(second.eventIds).toEqual([]);
  });

  it("owns queue/status/timeline handlers directly on the workflow plugin surface", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-coordination-workflow-plugin-"));
    await ensureCoordinationStorage(repoRoot);
    await saveWorkflow(repoRoot, workflow);

    const router = createCoordinationWorkflowRouter(resolveCoordinationAuthoringClient);
    const context: CoordinationWorkflowContext = {
      baseUrl: "http://localhost:3000",
      repoRoot,
      runtime: createCoordinationWorkflowRuntimeAdapter({
        repoRoot,
        inngestBaseUrl: "http://localhost:8288",
      }),
      inngestClient: {
        send: async () => ({ ids: ["evt-router-1"] }),
      } as unknown as Inngest,
      requestId: "req-coordination-router",
      correlationId: "corr-coordination-router",
      middlewareState: { markerCache: new Map() },
    };

    const client = createRouterClient(router, { context });
    const queued = await client.coordination.queueRun({
      workflowId: workflow.workflowId,
      runId: "run-router-owned",
      input: { ticket: "T-300" },
    });

    expect(queued.run.status).toBe("queued");
    expect(queued.eventIds).toEqual(["evt-router-1"]);

    const status = await client.coordination.getRunStatus({ runId: "run-router-owned" });
    expect(status.run.runId).toBe("run-router-owned");
    expect(status.run.status).toBe("queued");

    const timeline = await client.coordination.getRunTimeline({ runId: "run-router-owned" });
    expect(timeline.runId).toBe("run-router-owned");
    expect(timeline.timeline.some((event) => event.type === "run.started" && event.status === "queued")).toBe(true);
    await expect(getRunTimeline(repoRoot, "run-router-owned")).resolves.toEqual(timeline.timeline);
  });
});
