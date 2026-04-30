import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import type { WorkflowDispatcher } from "@rawr/sdk/spine";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import {
  createExecutionDescriptorTable,
  createExecutionRegistry,
  createMiniRuntimeResourceAccess,
  createProcessExecutionRuntime,
  mountMiniAsyncHarness,
  mountRuntimeInngestAsyncBoundary,
  type RuntimeInngestAsyncStepResponse,
} from "../../src/mini-runtime";
import { createAsyncStepBridgePayload } from "../../src/mini-runtime/adapters/async";
import {
  CreateWorkItemDescriptor,
  CreateWorkItemPlan,
  SyncWorkItemStepDescriptor,
  SyncWorkItemStepPlan,
  SyncWorkItemStepRef,
} from "../../fixtures/positive/app-and-plan-artifacts";
import { WorkItemsServerApiServices } from "../../fixtures/positive/server-api-plugin";
import type { WorkItem } from "../../fixtures/positive/work-items-service";

interface InngestStepRunOp<T> {
  readonly op: "StepRun";
  readonly name: string;
  readonly data: T;
}

function createClients(): ConstructionBoundServiceClients<
  typeof WorkItemsServerApiServices
> {
  return {
    workItems: {
      withInvocation() {
        return {
          items: {
            get(request) {
              return Effect.succeed({
                id: request.id,
                title: "Fixture item",
                status: "open",
              } satisfies WorkItem);
            },
            create(request) {
              return Effect.succeed({
                id: "created-via-inngest",
                title: request.title,
                status: "open",
              } satisfies WorkItem);
            },
            sync() {
              return Effect.succeed({ synced: true as const });
            },
          },
        };
      },
    },
  };
}

function createInvocationContext(event: {
  readonly name: string;
  readonly data: unknown;
}) {
  const dispatcher: WorkflowDispatcher = {
    kind: "workflow.dispatcher",
    async dispatch() {
      return { runId: "run-inngest" };
    },
  };

  return {
    event: {
      name: event.name,
      data: event.data,
    },
    clients: {
      workItems: createClients().workItems.withInvocation({
        invocation: { traceId: "trace-inngest" },
      }),
    },
    resources: createMiniRuntimeResourceAccess([
      {
        id: "async-scoped-store",
        value: {
          seen: true,
        },
        metadata: {
          secretToken: "async-resource-metadata-secret",
          liveHandle() {},
        },
      },
    ]),
    workflows: dispatcher,
    telemetry: {
      event() {},
    },
    execution: {
      traceId: "trace-inngest",
      secretToken: "async-execution-secret",
    },
  };
}

function createRuntime() {
  const table = createExecutionDescriptorTable([
    {
      ref: CreateWorkItemPlan.ref,
      descriptor: CreateWorkItemDescriptor,
    },
    {
      ref: SyncWorkItemStepRef,
      descriptor: SyncWorkItemStepDescriptor,
    },
  ]);
  const registry = createExecutionRegistry({
    plans: [CreateWorkItemPlan, SyncWorkItemStepPlan],
    descriptorTable: table,
  });

  return createProcessExecutionRuntime({ registry });
}

describe("phase two async Inngest live boundary", () => {
  test("handles an Inngest Bun serve function request and delegates through the process runtime", async () => {
    const runtime = createRuntime();
    const payload = createAsyncStepBridgePayload({ ref: SyncWorkItemStepRef });
    const harness = mountMiniAsyncHarness({
      harnessId: "async:hq:workflow",
      runtime,
      payloads: [payload],
    });
    const boundary = mountRuntimeInngestAsyncBoundary({
      boundaryId: "inngest:hq:workflow",
      clientId: "rawr-runtime-realization-lab",
      functionId: "work-items-sync",
      eventName: "rawr/work-item.sync",
      payload,
      harness,
      createInvocationContext,
    });

    try {
      const response = await boundary.handle(
        boundary.createRequest({
          runId: "run-inngest",
          eventData: {
            itemId: "item-1",
            requestedBy: "actor-inngest",
            secretToken: "async-event-secret",
          },
        }),
      );

      expect(response.status).toBe(206);
      const body =
        (await response.json()) as readonly InngestStepRunOp<RuntimeInngestAsyncStepResponse>[];

      expect(body).toHaveLength(1);
      const step = body[0];
      expect(step?.op).toBe("StepRun");
      expect(step?.name).toBe(SyncWorkItemStepRef.stepId);
      expect(step?.data).toMatchObject({
        kind: "inngest.runtime-async-step-response",
        executionId: SyncWorkItemStepRef.executionId,
        status: "success",
        output: { synced: true },
        owner: {
          kind: "workflow",
          id: "work-items.sync",
        },
        stepId: SyncWorkItemStepRef.stepId,
        eventName: "rawr/work-item.sync",
      });
      expect(step?.data.adapterEvents.map((event) => event.name)).toEqual([
        "adapter.delegate.start",
        "adapter.delegate.finish",
      ]);
      expect(step?.data.runtimeEvents.map((event) => event.name)).toEqual([
        "runtime.invoke.start",
        "boundary.policy.enter",
        "runtime.registry.resolve",
        "runtime.effect-runtime.enter",
        "boundary.policy.exit",
        "runtime.invoke.success",
      ]);
      expect(step?.data.harnessRecords.map((record) => record.phase)).toEqual([
        "harness.start",
        "harness.invoke.start",
        "harness.invoke.finished",
      ]);
      expect(boundary.records().map((record) => record.phase)).toEqual([
        "inngest.serve.received",
        "inngest.handler.enter",
        "inngest.step.run",
        "inngest.serve.responded",
      ]);

      const encoded = JSON.stringify(body);
      expect(encoded).not.toContain("async-event-secret");
      expect(encoded).not.toContain("async-resource-metadata-secret");
      expect(encoded).not.toContain("async-execution-secret");
    } finally {
      await harness.stop();
      await runtime.dispose();
    }
  });

  test("rejects unknown Inngest function ids before async harness invocation", async () => {
    let invocationCount = 0;
    const fakeHarness = {
      kind: "runtime.started-harness",
      harness: "async",
      harnessId: "async:fake",
      payloadExecutionIds: [SyncWorkItemStepRef.executionId],
      diagnostics: [],
      records() {
        return [];
      },
      async stop() {
        return [];
      },
      async runStep() {
        invocationCount += 1;
        throw new Error("async harness should not run");
      },
    } as const satisfies ReturnType<typeof mountMiniAsyncHarness>;

    const payload = createAsyncStepBridgePayload({ ref: SyncWorkItemStepRef });
    const boundary = mountRuntimeInngestAsyncBoundary({
      boundaryId: "inngest:hq:workflow",
      clientId: "rawr-runtime-realization-lab",
      functionId: "work-items-sync",
      eventName: "rawr/work-item.sync",
      payload,
      harness: fakeHarness,
      createInvocationContext,
    });
    const requestUrl = new URL("http://runtime.test/api/inngest");
    requestUrl.searchParams.set("fnId", "missing-function");

    const response = await boundary.handle(
      new Request(requestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "runtime.test",
        },
        body: JSON.stringify({
          version: 2,
          event: {
            name: "rawr/work-item.sync",
            data: {
              itemId: "item-1",
            },
          },
          events: [],
          steps: {},
          ctx: {
            run_id: "run-missing",
            attempt: 0,
            stack: {
              stack: [],
              current: 0,
            },
          },
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(invocationCount).toBe(0);
    expect(boundary.records().map((record) => record.phase)).toEqual([
      "inngest.serve.received",
      "inngest.serve.responded",
    ]);
  });
});
