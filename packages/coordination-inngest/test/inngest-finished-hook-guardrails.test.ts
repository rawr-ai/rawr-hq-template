import { describe, expect, it } from "vitest";
import {
  queueCoordinationRunWithInngest,
  processCoordinationRunEvent,
  type CoordinationRuntimeAdapter,
} from "../src";
import type { Inngest } from "inngest";
import type { CoordinationWorkflowV1, DeskRunEventV1, RunStatusV1 } from "@rawr/coordination";
import { RUN_FINALIZATION_CONTRACT_V1 } from "@rawr/coordination";

const workflow: CoordinationWorkflowV1 = {
  workflowId: "wf-finished-hook",
  version: 1,
  name: "Finished Hook Guardrails",
  entryDeskId: "desk-a",
  desks: [
    {
      deskId: "desk-a",
      kind: "desk:analysis",
      name: "A",
      responsibility: "Analyze",
      domain: "ops",
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      memoryScope: { persist: false },
    },
  ],
  handoffs: [],
};

function createRuntimeMock() {
  const statuses = new Map<string, RunStatusV1>();
  const timelines = new Map<string, DeskRunEventV1[]>();

  const runtime: CoordinationRuntimeAdapter = {
    readMemory: async () => ({ previous: true }),
    writeMemory: async () => {},
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

  return { runtime, statuses, timelines };
}

function createStepHarness(options?: { failStepId?: string }) {
  const memo = new Map<string, unknown>();
  return {
    run: async <T,>(id: string, fn: () => Promise<T>) => {
      if (options?.failStepId === id) {
        throw new Error(`synthetic step failure: ${id}`);
      }
      if (memo.has(id)) {
        return memo.get(id) as T;
      }
      const value = await fn();
      memo.set(id, value);
      return value;
    },
  };
}

describe("inngest finished-hook guardrails", () => {
  it("keeps queued run contract additive with explicit finalization semantics", async () => {
    const { runtime } = createRuntimeMock();
    const client = {
      send: async () => ({ ids: ["evt-d2-queued"] }),
    } as unknown as Inngest;

    const queued = await queueCoordinationRunWithInngest({
      client,
      runtime,
      workflow,
      runId: "run-d2-queued",
      input: { ticket: "T-1" },
      baseUrl: "http://localhost:3000",
    });

    expect(queued.run.status).toBe("queued");
    expect(queued.run.finalization?.contract).toEqual(RUN_FINALIZATION_CONTRACT_V1);
    expect(queued.run.finalization?.finishedHook).toBeUndefined();
  });

  it("treats finished-hook failures as non-critical on completed runs", async () => {
    const { runtime, statuses } = createRuntimeMock();
    let hookCalls = 0;

    await processCoordinationRunEvent({
      payload: {
        runId: "run-d2-finished-hook-failure",
        workflow,
        input: { ticket: "T-2" },
        baseUrl: "http://localhost:3000",
      },
      runtime,
      inngestRunId: "inngest-run-d2-1",
      inngestEventId: "evt-d2-1",
      step: createStepHarness(),
      finishedHook: async () => {
        hookCalls += 1;
        throw new Error("finished hook side effect failed");
      },
    });

    const completed = statuses.get("run-d2-finished-hook-failure");
    expect(completed?.status).toBe("completed");
    expect(completed?.finalization?.contract.exactlyOnce).toBe(false);
    expect(completed?.finalization?.contract.delivery).toBe("at-least-once");
    expect(completed?.finalization?.finishedHook?.outcome).toBe("failed");
    expect(completed?.finalization?.finishedHook?.error).toContain("finished hook side effect failed");
    expect(hookCalls).toBe(1);
  });

  it("records failed runs with the same non-exactly-once finished-hook contract", async () => {
    const { runtime, statuses } = createRuntimeMock();
    let hookCalls = 0;

    await expect(
      processCoordinationRunEvent({
        payload: {
          runId: "run-d2-runtime-failure",
          workflow,
          input: { ticket: "T-3" },
          baseUrl: "http://localhost:3000",
        },
        runtime,
        inngestRunId: "inngest-run-d2-2",
        inngestEventId: "evt-d2-2",
        step: createStepHarness({ failStepId: "desk/desk-a/execute" }),
        finishedHook: async () => {
          hookCalls += 1;
        },
      }),
    ).rejects.toThrow("synthetic step failure: desk/desk-a/execute");

    const failed = statuses.get("run-d2-runtime-failure");
    expect(failed?.status).toBe("failed");
    expect(failed?.finalization?.contract).toEqual(RUN_FINALIZATION_CONTRACT_V1);
    expect(failed?.finalization?.finishedHook?.outcome).toBe("succeeded");
    expect(hookCalls).toBe(1);
  });
});
