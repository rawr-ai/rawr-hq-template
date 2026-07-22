import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import type { WorkflowDispatcher } from "@rawr/sdk/spine";
import {
  CreateWorkItemDescriptor,
  CreateWorkItemPlan,
  CreateWorkItemRef,
  CreateWorkItemRouteDescriptor,
} from "../../../scenarios/work-items/app-and-plan-artifacts";
import { WorkItemsServerApiServices } from "../../../scenarios/work-items/server-api-plugin";
import type { WorkItem } from "../../../scenarios/work-items/work-items-service";
import { createServerAdapterCallbackPayload } from "../../../src/adapters/server";
import {
  createContainedRuntimeResourceAccess,
  createExecutionDescriptorTable,
  createExecutionRegistry,
  createProcessExecutionRuntime,
  mountOracleServerHarness,
  mountRuntimeOrpcServerBoundary,
} from "../../../src/oracle";
import type { RuntimeOrpcServerResponse } from "../../../src/oracle/adapters/orpc-server";

interface OrpcEncoded<T> {
  readonly json: T;
}

function createClients(): ConstructionBoundServiceClients<typeof WorkItemsServerApiServices> {
  return {
    workItems: {
      withInvocation() {
        return {
          items: {
            get(request) {
              return Effect.succeed({
                id: request.id,
                title: "Work item",
                status: "open",
              } satisfies WorkItem);
            },
            create(request) {
              return Effect.succeed({
                id: "created-via-orpc",
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

function createInvocationContext(request: {
  readonly input: unknown;
  readonly requestId?: string;
}) {
  const dispatcher: WorkflowDispatcher = {
    kind: "workflow.dispatcher",
    async dispatch() {
      return { runId: "run-orpc" };
    },
  };

  return {
    input: request.input,
    context: {
      request: {
        async requireActor() {
          return { id: "actor-orpc" };
        },
      },
      clients: createClients(),
      resources: createContainedRuntimeResourceAccess([
        {
          id: "request-scoped-store",
          value: {
            seen: true,
          },
          metadata: {
            secretToken: "resource-metadata-secret",
            liveHandle() {},
          },
        },
      ]),
      workflows: dispatcher,
    },
    telemetry: {
      event() {},
    },
    execution: {
      traceId: request.requestId ?? "trace-orpc",
      secretToken: "execution-secret",
    },
  };
}

function createRuntime() {
  const table = createExecutionDescriptorTable([
    {
      ref: CreateWorkItemRef,
      descriptor: CreateWorkItemDescriptor,
    },
  ]);
  const registry = createExecutionRegistry({
    plans: [CreateWorkItemPlan],
    descriptorTable: table,
  });

  return createProcessExecutionRuntime({ registry });
}

function createOrpcRpcRequest(input: unknown): Request {
  return new Request("http://runtime.test/rpc/invoke", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ json: input }),
  });
}

describe("phase two server oRPC live boundary", () => {
  test("handles an oRPC Fetch request and delegates through the process runtime", async () => {
    const runtime = createRuntime();
    const payload = createServerAdapterCallbackPayload({
      routeDescriptor: CreateWorkItemRouteDescriptor,
      ref: CreateWorkItemRef,
    });
    const harness = mountOracleServerHarness({
      harnessId: "server:hq:api",
      runtime,
      payloads: [payload],
    });
    const boundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:api",
      prefix: "/rpc",
      payload,
      harness,
      createInvocationContext,
    });

    try {
      const result = await boundary.handle(
        createOrpcRpcRequest({
          executionId: CreateWorkItemRef.executionId,
          requestId: "trace-orpc",
          input: {
            title: "oRPC request proof",
            secretToken: "server-request-secret",
          },
          context: {
            secretToken: "smuggled-request-context-secret",
          },
        })
      );
      expect(result.matched).toBe(true);
      expect(result.response.status).toBe(200);

      const body = (await result.response.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;

      expect(body.json.status).toBe("success");
      expect(body.json.output).toEqual({
        id: "created-via-orpc",
        title: "oRPC request proof",
        status: "open",
      });
      expect(body.json.route).toEqual({
        boundary: "plugin.server-api",
        routePath: ["items", "create"],
        surface: "api",
        capability: "work-items",
      });
      expect(body.json.adapterEvents.map((event) => event.name)).toEqual([
        "adapter.delegate.start",
        "adapter.delegate.finish",
      ]);
      expect(body.json.runtimeEvents.map((event) => event.name)).toEqual([
        "runtime.invoke.start",
        "boundary.policy.enter",
        "runtime.registry.resolve",
        "runtime.effect-runtime.enter",
        "boundary.policy.exit",
        "runtime.invoke.success",
      ]);
      expect(body.json.harnessRecords.map((record) => record.phase)).toEqual([
        "harness.start",
        "harness.invoke.start",
        "harness.invoke.finished",
      ]);
      expect(boundary.records().map((record) => record.phase)).toEqual([
        "orpc.fetch.received",
        "orpc.handler.enter",
        "orpc.handler.finished",
        "orpc.fetch.matched",
      ]);

      const encoded = JSON.stringify(body);
      expect(encoded).not.toContain("server-request-secret");
      expect(encoded).not.toContain("smuggled-request-context-secret");
      expect(encoded).not.toContain("resource-metadata-secret");
      expect(encoded).not.toContain("execution-secret");
    } finally {
      await harness.stop();
      await runtime.dispose();
    }
  });

  test("rejects unmatched oRPC paths before server harness invocation", async () => {
    let invocationCount = 0;
    const fakeHarness = {
      kind: "runtime.started-harness",
      harness: "server",
      harnessId: "server:fake",
      payloadExecutionIds: [CreateWorkItemRef.executionId],
      diagnostics: [],
      records() {
        return [];
      },
      async stop() {
        return [];
      },
      async handleRoute() {
        invocationCount += 1;
        throw new Error("server harness should not run");
      },
    } as const satisfies ReturnType<typeof mountOracleServerHarness>;

    const boundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:api",
      prefix: "/rpc",
      payload: createServerAdapterCallbackPayload({
        routeDescriptor: CreateWorkItemRouteDescriptor,
        ref: CreateWorkItemRef,
      }),
      harness: fakeHarness,
      createInvocationContext,
    });

    const result = await boundary.handle(
      new Request("http://runtime.test/not-rpc/invoke", {
        method: "POST",
        body: JSON.stringify({
          json: {
            executionId: CreateWorkItemRef.executionId,
            input: {
              title: "unmatched",
            },
          },
        }),
      })
    );

    expect(result.matched).toBe(false);
    expect(result.response.status).toBe(404);
    expect(invocationCount).toBe(0);
    expect(boundary.records().map((record) => record.phase)).toEqual([
      "orpc.fetch.received",
      "orpc.fetch.unmatched",
    ]);
  });
});
