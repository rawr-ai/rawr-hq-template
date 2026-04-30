import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import type {
  RuntimeResourceAccess,
  WorkflowDispatcher,
} from "@rawr/sdk/spine";
import {
  createExecutionDescriptorTable,
  createProcessExecutionRuntime,
  createExecutionRegistry,
  validateProviderClosure,
} from "@rawr/spec-env/spine/simulate";
import {
  CreateWorkItemDescriptor,
  CreateWorkItemPlan,
  CreateWorkItemRef,
  PortableArtifact,
} from "../fixtures/positive/app-and-plan-artifacts";
import { RuntimeFixtureProfile } from "../fixtures/positive/resource-provider-profile";
import type { WorkItem } from "../fixtures/positive/work-items-service";
import { WorkItemsServerApiServices } from "../fixtures/positive/server-api-plugin";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";

function createClients(): {
  readonly clients: ConstructionBoundServiceClients<typeof WorkItemsServerApiServices>;
  readonly traces: string[];
} {
  const traces: string[] = [];

  return {
    traces,
    clients: {
      workItems: {
        withInvocation(input) {
          traces.push(input.invocation.traceId);
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
                  id: "created-1",
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
    },
  };
}

describe("runtime realization type env simulation", () => {
  test("assembles descriptor table and registry from refs plus descriptors", () => {
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

    expect([...table.entries()].map((entry) => entry.ref.executionId)).toEqual([
      "exec:server:work-items:create",
    ]);
    expect(registry.get(CreateWorkItemRef).descriptor).toBe(CreateWorkItemDescriptor);
  });

  test("rejects invalid registry assembly before invocation", () => {
    const table = createExecutionDescriptorTable([
      {
        ref: CreateWorkItemRef,
        descriptor: CreateWorkItemDescriptor,
      },
    ]);

    expect(() =>
      createExecutionDescriptorTable([
        {
          ref: CreateWorkItemRef,
          descriptor: CreateWorkItemDescriptor,
        },
        {
          ref: CreateWorkItemRef,
          descriptor: CreateWorkItemDescriptor,
        },
      ]),
    ).toThrow("duplicate descriptor");

    expect(() =>
      createExecutionRegistry({
        plans: [CreateWorkItemPlan, CreateWorkItemPlan],
        descriptorTable: table,
      }),
    ).toThrow("duplicate execution plan");

    expect(() =>
      createExecutionRegistry({
        plans: [CreateWorkItemPlan],
        descriptorTable: createExecutionDescriptorTable([]),
      }),
    ).toThrow("missing descriptor");

    const mismatchedDescriptor = {
      ...CreateWorkItemDescriptor,
      ref: {
        ...CreateWorkItemRef,
        executionId: "exec:server:work-items:other",
      },
    };

    expect(() =>
      createExecutionDescriptorTable([
        {
          ref: CreateWorkItemRef,
          descriptor: mismatchedDescriptor,
        },
      ]),
    ).toThrow("descriptor table entry mismatch");

    const sameIdDifferentIdentityRef = {
      ...CreateWorkItemRef,
      routePath: ["items", "rename"],
    };
    const sameIdDifferentIdentityDescriptor = {
      ...CreateWorkItemDescriptor,
      ref: sameIdDifferentIdentityRef,
    };

    expect(() =>
      createExecutionDescriptorTable([
        {
          ref: CreateWorkItemRef,
          descriptor: sameIdDifferentIdentityDescriptor,
        },
      ]),
    ).toThrow("descriptor table entry mismatch");

    expect(() =>
      createExecutionRegistry({
        plans: [
          {
            ...CreateWorkItemPlan,
            ref: sameIdDifferentIdentityRef,
          },
        ],
        descriptorTable: table,
      }),
    ).toThrow("execution plan descriptor mismatch");
  });

  test("supplies runtime-bound values through invocation context", async () => {
    const { clients, traces } = createClients();
    const dispatcher: WorkflowDispatcher = {
      kind: "workflow.dispatcher",
      async dispatch() {
        return { runId: "run-1" };
      },
    };

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
    const runtime = createProcessExecutionRuntime({ registry });
    try {
      const result = await runtime.invoke<WorkItem>({
        ref: CreateWorkItemRef,
        context: {
          input: {
            title: "From invocation",
          },
          context: {
            request: {
              async requireActor() {
                return { id: "actor-1" };
              },
            },
            clients,
            resources: {
              kind: "runtime.resource-access",
            } as RuntimeResourceAccess,
            workflows: dispatcher,
          },
          telemetry: {
            event() {},
          },
          execution: {
            traceId: "trace-1",
          },
        },
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") throw result.error;

      expect(result.output).toEqual({
        id: "created-1",
        title: "From invocation",
        status: "open",
      });
      expect(traces).toEqual(["trace-1"]);
      expect(result.events.map((event) => event.name)).toEqual([
        "runtime.invoke.start",
        "boundary.policy.enter",
        "runtime.registry.resolve",
        "runtime.effect-runtime.enter",
        "boundary.policy.exit",
        "runtime.invoke.success",
      ]);
    } finally {
      await runtime.dispose();
    }
  });

  test("runs direct RawrEffect descriptor bodies through the same runtime path", async () => {
    const directEffectDescriptor = {
      ...CreateWorkItemDescriptor,
      run() {
        return Effect.succeed({
          id: "direct-1",
          title: "Direct effect",
          status: "open",
        } satisfies WorkItem);
      },
    };

    const table = createExecutionDescriptorTable([
      {
        ref: CreateWorkItemRef,
        descriptor: directEffectDescriptor,
      },
    ]);
    const registry = createExecutionRegistry({
      plans: [CreateWorkItemPlan],
      descriptorTable: table,
    });
    const runtime = createProcessExecutionRuntime({ registry });
    try {
      const result = await runtime.invoke<WorkItem>({
        ref: CreateWorkItemRef,
        context: {},
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") throw result.error;
      expect(result.output.id).toBe("direct-1");
    } finally {
      await runtime.dispose();
    }
  });

  test("portable artifact carries refs and no executable table", () => {
    expect(PortableArtifact.executionDescriptorRefs).toHaveLength(2);
    expect("descriptorTable" in PortableArtifact).toBe(false);
  });

  test("profile provider requirements are closed before boot", () => {
    expect(validateProviderClosure(RuntimeFixtureProfile)).toEqual([]);

    const missingClockProfile = {
      ...RuntimeFixtureProfile,
      providerSelections: RuntimeFixtureProfile.providerSelections.filter(
        (selection) => selection.resource.id !== "clock",
      ),
    };

    expect(validateProviderClosure(missingClockProfile)).toEqual([
      {
        code: "runtime.provider.missing-required-resource",
        message:
          "provider email.sender.memory requires clock, but the profile does not select a provider for it",
      },
    ]);
  });
});
