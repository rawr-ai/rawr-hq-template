import { beforeEach, describe, expect, it } from "vitest";
import { createRouterClient } from "@orpc/server";
import type { Inngest } from "inngest";
import { createInMemoryTriageWorkItemStore, supportTriageClientRouter } from "@rawr/support-triage";
import {
  __resetSupportTriageRunStoreForTests,
  createSupportTriageWorkflowRouter,
  processSupportTriageRequestedEvent,
  type SupportTriageWorkflowContext,
} from "../../../plugins/workflows/support-triage";
import { createCoordinationRuntimeAdapter } from "../src/coordination";

describe("support-triage workflow plugin", () => {
  beforeEach(() => {
    __resetSupportTriageRunStoreForTests();
  });

  it("exposes trigger/status operations through plugin-owned router", async () => {
    const fakeInngest = {
      send: async () => ({ ids: ["evt-support-triage-1"] }),
    } as unknown as Inngest;

    const router = createSupportTriageWorkflowRouter();
    const store = createInMemoryTriageWorkItemStore();
    const deps = {
      store,
      now: () => "2026-02-23T00:00:00.000Z",
      generateWorkItemId: () => `work-item-${Math.random().toString(16).slice(2, 10)}`,
    } as const;
    const context: SupportTriageWorkflowContext = {
      baseUrl: "http://localhost:3000",
      repoRoot: "/tmp/rawr-test-repo",
      runtime: createCoordinationRuntimeAdapter({
        repoRoot: "/tmp/rawr-test-repo",
        inngestBaseUrl: "http://localhost:8288",
      }),
      inngestClient: fakeInngest,
      supportTriage: createRouterClient(supportTriageClientRouter, { context: { deps } }),
      requestId: "req-1",
      correlationId: "corr-1",
      middlewareState: { markerCache: new Map() },
    };

    const client = createRouterClient(router, { context });

    const triggered = await client.triggerRun({
      queueId: "queue-main",
      requestedBy: "leg1-impl-workflows",
      dryRun: true,
    });

    expect(triggered.accepted).toBe(true);
    expect(triggered.run.status).toBe("queued");
    expect(triggered.run.queueId).toBe("queue-main");
    expect(typeof triggered.run.workItemId).toBe("string");
    expect(triggered.eventIds).toEqual(["evt-support-triage-1"]);

    const capabilityStatus = await client.getStatus({});
    expect(capabilityStatus.capability).toBe("support-triage");
    expect(capabilityStatus.healthy).toBe(true);

    const runStatus = await client.getStatus({ runId: triggered.run.runId });
    expect(runStatus.run?.runId).toBe(triggered.run.runId);
    expect(runStatus.run?.status).toBe("queued");
  });

  it("runs durable support-triage processing and persists completed run state", async () => {
    const fakeInngest = {
      send: async () => ({ ids: ["evt-support-triage-1"] }),
    } as unknown as Inngest;

    const router = createSupportTriageWorkflowRouter();
    const store = createInMemoryTriageWorkItemStore();
    const deps = {
      store,
      now: () => "2026-02-23T00:00:00.000Z",
      generateWorkItemId: () => "work-item-001",
    } as const;
    const context: SupportTriageWorkflowContext = {
      baseUrl: "http://localhost:3000",
      repoRoot: "/tmp/rawr-test-repo",
      runtime: createCoordinationRuntimeAdapter({
        repoRoot: "/tmp/rawr-test-repo",
        inngestBaseUrl: "http://localhost:8288",
      }),
      inngestClient: fakeInngest,
      supportTriage: createRouterClient(supportTriageClientRouter, { context: { deps } }),
      requestId: "req-1",
      correlationId: "corr-1",
      middlewareState: { markerCache: new Map() },
    };
    const client = createRouterClient(router, { context });

    const triggered = await client.triggerRun({
      queueId: "queue-main",
      requestedBy: "leg1-impl-workflows",
      dryRun: false,
    });

    const stepMemo = new Map<string, unknown>();
    const summary = await processSupportTriageRequestedEvent({
      payload: {
        runId: triggered.run.runId,
        workItemId: triggered.run.workItemId,
        repoRoot: context.repoRoot,
        queueId: "queue-main",
        requestedBy: "leg1-impl-workflows",
        dryRun: false,
      },
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
      deps,
    });

    expect(summary.triagedTicketCount).toBe(42);
    expect(summary.escalatedTicketCount).toBe(6);

    const finalStatus = await client.getStatus({ runId: triggered.run.runId });
    expect(finalStatus.run?.status).toBe("completed");
    expect(finalStatus.run?.triagedTicketCount).toBe(42);
    expect(finalStatus.run?.escalatedTicketCount).toBe(6);

    const workItemStatus = await context.supportTriage.getWorkItem({ workItemId: triggered.run.workItemId });
    expect(workItemStatus.workItem.status).toBe("completed");
  });
});
