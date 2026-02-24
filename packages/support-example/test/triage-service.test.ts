import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { supportExampleClientProcedures } from "../src/client";
import { createInMemoryTriageWorkItemStore } from "../src/service/triage/store";

function createClient(seed: { now: string[]; ids: string[] }) {
  const store = createInMemoryTriageWorkItemStore();
  const nowValues = [...seed.now];
  const idValues = [...seed.ids];

  return createRouterClient(supportExampleClientProcedures, {
    context: {
      deps: {
        store,
        now: () => nowValues.shift() ?? "2026-02-22T00:00:00.000Z",
        generateWorkItemId: () => idValues.shift() ?? `triage-${Math.random().toString(16).slice(2, 10)}`,
      },
    },
  });
}

describe("support-example service", () => {
  it("creates, starts, and completes a queue-scoped triage work item", async () => {
    const client = createClient({
      now: ["2026-02-22T10:00:00.000Z", "2026-02-22T10:00:01.000Z", "2026-02-22T10:00:02.000Z"],
      ids: ["triage.queue-001"],
    });

    const requested = await client.triage.items.request({
      queueId: "queue.alpha",
      requestedBy: "user.demo",
      source: "manual",
    });

    expect(requested.workItem.status).toBe("queued");
    expect(requested.workItem.queueId).toBe("queue.alpha");

    const started = await client.triage.items.start({ workItemId: requested.workItem.workItemId });
    expect(started.workItem.status).toBe("running");

    const completed = await client.triage.items.complete({
      workItemId: requested.workItem.workItemId,
      succeeded: true,
      triagedTicketCount: 12,
      escalatedTicketCount: 3,
    });

    expect(completed.workItem.status).toBe("completed");
    expect(completed.workItem.triagedTicketCount).toBe(12);
    expect(completed.workItem.escalatedTicketCount).toBe(3);
    expect(completed.workItem.completedAt).toBeDefined();
    expect(completed.workItem.failedAt).toBeUndefined();
  });

  it("rejects invalid status transitions", async () => {
    const client = createClient({
      now: ["2026-02-22T11:00:00.000Z", "2026-02-22T11:00:01.000Z", "2026-02-22T11:00:02.000Z"],
      ids: ["triage.queue-002"],
    });

    const requested = await client.triage.items.request({
      queueId: "queue.beta",
      requestedBy: "user.demo",
    });

    await expect(
      client.triage.items.complete({
        workItemId: requested.workItem.workItemId,
        succeeded: true,
        triagedTicketCount: 1,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
      status: 409,
    });
  });
});
