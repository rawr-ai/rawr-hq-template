import { beforeEach, describe, expect, it } from "vitest";
import { createRouterClient } from "@orpc/server";
import type { Inngest } from "inngest";
import { createInMemoryTriageWorkItemStore, supportExampleClientProcedures } from "@rawr/support-example";
import {
  __resetSupportExampleRunStoreForTests,
  createSupportExampleWorkflowRouter,
  processSupportExampleRequestedEvent,
  type SupportExampleWorkflowContext,
} from "../../../plugins/workflows/support-example";
import { createCoordinationRuntimeAdapter } from "../src/coordination";

describe("support-example workflow plugin", () => {
  beforeEach(() => {
    __resetSupportExampleRunStoreForTests();
  });

  it("exposes trigger/status operations through plugin-owned router", async () => {
    const fakeInngest = {
      send: async () => ({ ids: ["evt-support-example-1"] }),
    } as unknown as Inngest;

    const router = createSupportExampleWorkflowRouter();
    const store = createInMemoryTriageWorkItemStore();
    const deps = {
      store,
      now: () => "2026-02-23T00:00:00.000Z",
      generateWorkItemId: () => `work-item-${Math.random().toString(16).slice(2, 10)}`,
    } as const;
    const context: SupportExampleWorkflowContext = {
      baseUrl: "http://localhost:3000",
      repoRoot: "/tmp/rawr-test-repo",
      runtime: createCoordinationRuntimeAdapter({
        repoRoot: "/tmp/rawr-test-repo",
        inngestBaseUrl: "http://localhost:8288",
      }),
      inngestClient: fakeInngest,
      supportExample: createRouterClient(supportExampleClientProcedures, { context: { deps } }),
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
    expect(triggered.eventIds).toEqual(["evt-support-example-1"]);

    const capabilityStatus = await client.getStatus({});
    expect(capabilityStatus.capability).toBe("support-example");
    expect(capabilityStatus.healthy).toBe(true);

    const runStatus = await client.getStatus({ runId: triggered.run.runId });
    expect(runStatus.run?.runId).toBe(triggered.run.runId);
    expect(runStatus.run?.status).toBe("queued");
  });

  it("runs durable support-example processing and persists completed run state", async () => {
    const fakeInngest = {
      send: async () => ({ ids: ["evt-support-example-1"] }),
    } as unknown as Inngest;

    const router = createSupportExampleWorkflowRouter();
    const store = createInMemoryTriageWorkItemStore();
    const deps = {
      store,
      now: () => "2026-02-23T00:00:00.000Z",
      generateWorkItemId: () => "work-item-001",
    } as const;
    const context: SupportExampleWorkflowContext = {
      baseUrl: "http://localhost:3000",
      repoRoot: "/tmp/rawr-test-repo",
      runtime: createCoordinationRuntimeAdapter({
        repoRoot: "/tmp/rawr-test-repo",
        inngestBaseUrl: "http://localhost:8288",
      }),
      inngestClient: fakeInngest,
      supportExample: createRouterClient(supportExampleClientProcedures, { context: { deps } }),
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
    const summary = await processSupportExampleRequestedEvent({
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

    const workItemStatus = await context.supportExample.triage.items.get({ workItemId: triggered.run.workItemId });
    expect(workItemStatus.workItem.status).toBe("completed");
  });
});
