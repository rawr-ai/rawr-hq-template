import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { createInMemoryTriageWorkItemStore, supportTriageClientProcedures } from "../src";

function createClient() {
  const store = createInMemoryTriageWorkItemStore();
  let idCounter = 0;

  return createRouterClient(supportTriageClientProcedures, {
    context: {
      deps: {
        store,
        now: () => "2026-02-24T00:00:00.000Z",
        generateWorkItemId: () => {
          idCounter += 1;
          return `work-item-${idCounter}`;
        },
      },
    },
  });
}

type OrpcErrorShape = {
  defined?: boolean;
  code?: string;
  status?: number;
  data?: Record<string, unknown>;
};

async function expectOrpcError(
  promise: Promise<unknown>,
  expected: {
    code: string;
    status: number;
    data?: Record<string, unknown>;
  },
) {
  try {
    await promise;
    throw new Error(`expected ORPCError ${expected.code}`);
  } catch (error) {
    const typed = error as OrpcErrorShape;
    expect(typed.defined).toBe(true);
    expect(typed.code).toBe(expected.code);
    expect(typed.status).toBe(expected.status);

    if (expected.data) {
      expect(typed.data).toMatchObject(expected.data);
    }
  }
}

describe("support-triage procedures typed errors", () => {
  it("returns INVALID_QUEUE_ID for whitespace queue IDs", async () => {
    const client = createClient();

    await expectOrpcError(
      client.requestWorkItem({
        queueId: "   ",
        requestedBy: "user.test",
        source: "manual",
      }),
      {
        code: "INVALID_QUEUE_ID",
        status: 400,
        data: { queueId: "   " },
      },
    );
  });

  it("returns WORK_ITEM_NOT_FOUND for unknown work item IDs", async () => {
    const client = createClient();

    await expectOrpcError(client.getWorkItem({ workItemId: "missing-work-item" }), {
      code: "WORK_ITEM_NOT_FOUND",
      status: 404,
      data: { workItemId: "missing-work-item" },
    });
  });

  it("returns INVALID_STATUS_TRANSITION when completing a queued work item", async () => {
    const client = createClient();
    const requested = await client.requestWorkItem({
      queueId: "queue-alpha",
      requestedBy: "user.test",
      source: "manual",
    });

    await expectOrpcError(
      client.completeWorkItem({
        workItemId: requested.workItem.workItemId,
        succeeded: true,
        triagedTicketCount: 1,
      }),
      {
        code: "INVALID_STATUS_TRANSITION",
        status: 409,
        data: {
          workItemId: requested.workItem.workItemId,
          from: "queued",
          to: "completed",
        },
      },
    );
  });
});
