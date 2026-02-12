import { describe, expect, it } from "vitest";
import {
  compileWorkflowToInngest,
  fromWorkflowKitWorkflow,
  processCoordinationRunEvent,
  queueCoordinationRunWithInngest,
  toWorkflowKitWorkflow,
  type CoordinationRuntimeAdapter,
} from "../src";
import type { CoordinationWorkflowV1, DeskRunEventV1, RunStatusV1 } from "@rawr/coordination";
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
    readMemory: async (_workflow, deskId) => {
      return { deskId, previous: true };
    },
    writeMemory: async (_workflow, desk, value) => {
      memoryWrites.set(desk.deskId, value);
    },
    getRunStatus: async (runId) => statuses.get(runId) ?? null,
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

  return {
    runtime,
    statuses,
    timelines,
    memoryWrites,
  };
}

describe("coordination inngest adapter", () => {
  it("compiles workflow actions and edges", () => {
    const compiled = compileWorkflowToInngest(workflow);
    expect(compiled.actions.map((a) => a.id)).toEqual(["desk-a", "desk-b"]);
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
});
