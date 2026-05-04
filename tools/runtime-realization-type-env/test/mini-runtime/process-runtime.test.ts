import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import { Effect as VendorEffect } from "../../src/vendor/effect/runtime";
import type {
  RuntimeResourceAccess,
  WorkflowDispatcher,
} from "@rawr/sdk/spine";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import {
  createDeploymentRuntimeHandoff,
  createExecutionDescriptorTable,
  createExecutionRegistry,
  createProcessExecutionRuntime,
  lowerOpaqueProviderPlan,
} from "../../src/mini-runtime";
import { lowerAsyncStepCallback } from "../../src/mini-runtime/adapters/async";
import { lowerServerCallback } from "../../src/mini-runtime/adapters/server";
import {
  CreateWorkItemDescriptor,
  CreateWorkItemPlan,
  CreateWorkItemRef,
  PortableArtifact,
} from "../../fixtures/positive/app-and-plan-artifacts";
import {
  EmailProvider,
  EmailSenderResource,
  RuntimeFixtureProfile,
} from "../../fixtures/positive/resource-provider-profile";
import type { WorkItem } from "../../fixtures/positive/work-items-service";
import { WorkItemsServerApiServices } from "../../fixtures/positive/server-api-plugin";

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
                id: "created-v2",
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

function createInvocationContext() {
  const dispatcher: WorkflowDispatcher = {
    kind: "workflow.dispatcher",
    async dispatch() {
      return { runId: "run-1" };
    },
  };

  return {
    input: {
      title: "Mini runtime",
    },
    context: {
      request: {
        async requireActor() {
          return { id: "actor-1" };
        },
      },
      clients: createClients(),
      resources: {
        kind: "runtime.resource-access",
      } as RuntimeResourceAccess,
      workflows: dispatcher,
    },
    telemetry: {
      event() {},
    },
    execution: {
      traceId: "trace-v2",
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

describe("runtime realization mini runtime", () => {
  test("runs descriptors through registry and real Effect runtime access", async () => {
    const runtime = createRuntime();
    try {
      const result = await runtime.invoke<WorkItem>({
        ref: CreateWorkItemRef,
        context: createInvocationContext(),
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") throw result.error;
      expect(result.output).toEqual({
        id: "created-v2",
        title: "Mini runtime",
        status: "open",
      });
      expect(result.exit._tag).toBe("Success");
      expect(result.events.map((event) => event.name)).toEqual([
        "runtime.invoke.start",
        "runtime.registry.resolve",
        "runtime.effect-runtime.enter",
        "runtime.invoke.success",
      ]);
    } finally {
      await runtime.dispose();
    }
  });

  test("host adapter callbacks delegate into the same process runtime", async () => {
    const runtime = createRuntime();
    try {
      const serverResult = await lowerServerCallback<WorkItem>(runtime, {
        ref: CreateWorkItemRef,
        context: createInvocationContext(),
      });
      const asyncResult = await lowerAsyncStepCallback<WorkItem>(runtime, {
        ref: CreateWorkItemRef,
        context: createInvocationContext(),
      });

      expect(serverResult.status).toBe("success");
      expect(asyncResult.status).toBe("success");
    } finally {
      await runtime.dispose();
    }
  });

  test("keeps provider lowering as an explicit experiment while executing real Effect", async () => {
    const plan = EmailProvider.build({
      config: { from: "lab@example.com" },
      resources: new Map(),
      scope: { processId: "process-1", role: "server" },
      telemetry: { event() {} },
      diagnostics: { report() {} },
    });
    const lowered = lowerOpaqueProviderPlan(plan, {
      async send() {},
    });

    expect(lowered.kind).toBe("provider.lowering-experiment");
    expect(lowered.plan).toBe(plan);
    expect(lowered.diagnostics[0]?.code).toBe(
      "runtime.provider.effect-plan-shape-open",
    );
    await expect(
      VendorEffect.runPromise(
        Effect.tryPromise({
          try: async () => EmailSenderResource.id,
          catch: (cause) => cause,
        }).pipe(Effect.flatMap(() => lowered.acquire)),
      ),
    ).resolves.toEqual({
      send: expect.any(Function),
    });
  });

  test("deployment handoff is compile-only and carries no descriptor table", () => {
    const handoff = createDeploymentRuntimeHandoff({
      portableArtifact: PortableArtifact,
      compiledProcessPlan: {
        kind: "compiled.process-plan",
        appId: "hq",
        executionPlans: [CreateWorkItemPlan],
      },
    });

    expect(handoff.kind).toBe("deployment.runtime-handoff");
    expect(handoff.appId).toBe("hq");
    expect("descriptorTable" in handoff.portableArtifact).toBe(false);
    expect(handoff.compiledProcessPlan.executionPlans).toEqual([CreateWorkItemPlan]);
    expect(RuntimeFixtureProfile.kind).toBe("runtime.profile");
  });
});
