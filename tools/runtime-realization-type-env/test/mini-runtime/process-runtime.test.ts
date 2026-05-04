import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import { Effect as VendorEffect } from "../../src/vendor/effect/runtime";
import type {
  CompiledProcessPlan,
  PortableRuntimePlanArtifact,
  WorkflowDispatcher,
} from "@rawr/sdk/spine";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import {
  createDeploymentRuntimeHandoff,
  createExecutionDescriptorTable,
  createExecutionRegistry,
  createMiniRuntimeResourceAccess,
  createMiniServiceBindingCache,
  createProcessExecutionRuntime,
  executeMiniBootgraph,
  type ProcessExecutionRuntime,
} from "../../src/mini-runtime";
import type { AdapterDelegationEvent } from "../../src/mini-runtime/adapters/delegation";
import { lowerAsyncStepCallback } from "../../src/mini-runtime/adapters/async";
import { lowerServerCallback } from "../../src/mini-runtime/adapters/server";
import {
  CreateWorkItemDescriptor,
  CreateWorkItemPlan,
  CreateWorkItemRef,
  PortableArtifact,
  SyncWorkItemStepDescriptor,
  SyncWorkItemStepPlan,
  SyncWorkItemStepRef,
} from "../../fixtures/positive/app-and-plan-artifacts";
import { RuntimeFixtureProfile } from "../../fixtures/positive/resource-provider-profile";
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
      resources: createMiniRuntimeResourceAccess([]),
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

function createAsyncInvocationContext() {
  return {
    event: {
      data: {
        itemId: "item-1",
        requestedBy: "actor-1",
      },
    },
    clients: {
      workItems: createClients().workItems.withInvocation({
        invocation: { traceId: "trace-async" },
      }),
    },
    resources: createMiniRuntimeResourceAccess([]),
    telemetry: {
      event() {},
    },
    execution: {
      traceId: "trace-async",
    },
  };
}

function createRuntime() {
  const table = createExecutionDescriptorTable([
    {
      ref: CreateWorkItemRef,
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

function parseConstructionIdentity(identity: string): Record<string, unknown> {
  return JSON.parse(identity) as Record<string, unknown>;
}

function assertNoLiveHandles(value: unknown): void {
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new Error(`catalog leaked live handle value: ${String(value)}`);
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) assertNoLiveHandles(entry);
    return;
  }

  for (const entry of Object.values(value)) {
    assertNoLiveHandles(entry);
  }
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

  test("server host adapter callback delegates into the same process runtime", async () => {
    const runtime = createRuntime();
    const adapterEvents: AdapterDelegationEvent[] = [];
    const instrumentation = {
      record(event: AdapterDelegationEvent) {
        adapterEvents.push(event);
      },
    };

    try {
      const serverResult = await lowerServerCallback<WorkItem>(runtime, {
        ref: CreateWorkItemRef,
        context: createInvocationContext(),
        instrumentation,
      });
      expect(serverResult.status).toBe("success");
      expect(
        adapterEvents.map((event) => ({
          adapter: event.adapter,
          name: event.name,
          status: event.status,
        })),
      ).toEqual([
        {
          adapter: "server",
          name: "adapter.delegate.start",
          status: undefined,
        },
        {
          adapter: "server",
          name: "adapter.delegate.finish",
          status: "success",
        },
      ]);
    } finally {
      await runtime.dispose();
    }
  });

  test("async host adapter callback delegates into the compiled process runtime", async () => {
    const runtime = createRuntime();
    const adapterEvents: AdapterDelegationEvent[] = [];
    const instrumentation = {
      record(event: AdapterDelegationEvent) {
        adapterEvents.push(event);
      },
    };

    try {
      const asyncResult = await lowerAsyncStepCallback<
        { readonly skipped: true } | { readonly synced: true }
      >(runtime, {
        ref: SyncWorkItemStepRef,
        context: createAsyncInvocationContext(),
        instrumentation,
      });

      expect(asyncResult.status).toBe("success");
      if (asyncResult.status !== "success") throw asyncResult.error;
      expect(asyncResult.output).toEqual({ synced: true });
      expect(
        adapterEvents.map((event) => ({
          adapter: event.adapter,
          executionId: event.executionId,
          name: event.name,
          status: event.status,
        })),
      ).toEqual([
        {
          adapter: "async-step",
          executionId: SyncWorkItemStepRef.executionId,
          name: "adapter.delegate.start",
          status: undefined,
        },
        {
          adapter: "async-step",
          executionId: SyncWorkItemStepRef.executionId,
          name: "adapter.delegate.finish",
          status: "success",
        },
      ]);
    } finally {
      await runtime.dispose();
    }
  });

  test("adapter delegation instrumentation does not expose descriptor execution to adapters", async () => {
    let descriptorRan = false;
    const descriptor = {
      ...CreateWorkItemDescriptor,
      run() {
        descriptorRan = true;
        return Effect.succeed({
          id: "adapter-direct",
          title: "Should not run in adapter",
          status: "open",
        } satisfies WorkItem);
      },
    };
    const output = {
      id: "delegated",
      title: "Delegated through runtime",
      status: "open",
    } satisfies WorkItem;
    const delegatedRefs: string[] = [];
    const adapterEvents: AdapterDelegationEvent[] = [];
    const fakeRuntime: ProcessExecutionRuntime = {
      kind: "process.execution-runtime",
      async invoke(input) {
        delegatedRefs.push(input.ref.executionId);
        return {
          kind: "runtime.invocation-result",
          status: "success",
          output,
          exit: await VendorEffect.runPromiseExit(Effect.succeed(output)),
          events: [],
        };
      },
      async dispose() {},
    };
    const instrumentation = {
      record(event: AdapterDelegationEvent) {
        adapterEvents.push(event);
      },
    };

    const serverResult = await lowerServerCallback<WorkItem>(fakeRuntime, {
      ref: descriptor.ref,
      context: createInvocationContext(),
      instrumentation,
    });
    const asyncResult = await lowerAsyncStepCallback<WorkItem>(fakeRuntime, {
      ref: SyncWorkItemStepRef,
      context: createInvocationContext(),
      instrumentation,
    });

    expect(serverResult.status).toBe("success");
    expect(asyncResult.status).toBe("success");
    expect(descriptorRan).toBe(false);
    expect(delegatedRefs).toEqual([
      CreateWorkItemRef.executionId,
      SyncWorkItemStepRef.executionId,
    ]);
    expect(adapterEvents.map((event) => `${event.adapter}:${event.name}`)).toEqual([
      "server:adapter.delegate.start",
      "server:adapter.delegate.finish",
      "async-step:adapter.delegate.start",
      "async-step:adapter.delegate.finish",
    ]);
  });

  test("orders boot modules and finalizes in reverse with redacted in-memory records", async () => {
    const startLog: string[] = [];
    const finalizeLog: string[] = [];
    const modules = [
      {
        kind: "mini-runtime.boot-module",
        id: "api",
        dependencies: ["email"],
        metadata: {
          publicLabel: "api",
          secretToken: "super-secret-api",
          liveHandle: () => "not catalog safe",
        },
        start() {
          startLog.push("api");
          return { close() {}, token: "live-api-token" };
        },
        finalize() {
          finalizeLog.push("api");
        },
      },
      {
        kind: "mini-runtime.boot-module",
        id: "clock",
        metadata: {
          publicLabel: "clock",
        },
        start() {
          startLog.push("clock");
          return { close() {} };
        },
        finalize() {
          finalizeLog.push("clock");
        },
      },
      {
        kind: "mini-runtime.boot-module",
        id: "email",
        dependencies: ["clock"],
        metadata: {
          publicLabel: "email",
          password: "super-secret-email",
        },
        start() {
          startLog.push("email");
          return { close() {}, password: "live-email-password" };
        },
        finalize() {
          finalizeLog.push("email");
        },
      },
    ] as const;

    const result = await executeMiniBootgraph({ modules });

    expect(result.status).toBe("started");
    if (result.status !== "started") throw result.error;
    expect(result.startupOrder).toEqual(["clock", "email", "api"]);
    expect(startLog).toEqual(["clock", "email", "api"]);

    const startupCatalog = result.catalog();
    expect(JSON.stringify(startupCatalog)).not.toContain("super-secret");
    expect(JSON.stringify(startupCatalog)).not.toContain("live-api-token");
    assertNoLiveHandles(startupCatalog);

    const finalizedCatalog = await result.finalize();
    expect(finalizeLog).toEqual(["api", "email", "clock"]);
    expect(
      finalizedCatalog.records
        .filter((record) => record.phase === "boot.finalize.finished")
        .map((record) => record.subjectId),
    ).toEqual(["api", "email", "clock"]);
    expect(JSON.stringify(finalizedCatalog)).not.toContain("super-secret");
    assertNoLiveHandles(finalizedCatalog);
  });

  test("continues reverse finalization and records failed finalizers", async () => {
    const finalizeLog: string[] = [];
    const result = await executeMiniBootgraph({
      modules: [
        {
          kind: "mini-runtime.boot-module",
          id: "database",
          start() {
            return { close() {} };
          },
          finalize() {
            finalizeLog.push("database");
          },
        },
        {
          kind: "mini-runtime.boot-module",
          id: "api",
          dependencies: ["database"],
          start() {
            return { close() {} };
          },
          finalize() {
            finalizeLog.push("api");
            throw new Error("api finalizer failed");
          },
        },
      ],
    });

    expect(result.status).toBe("started");
    if (result.status !== "started") throw result.error;
    const catalog = await result.finalize();

    expect(finalizeLog).toEqual(["api", "database"]);
    expect(
      catalog.records
        .filter((record) =>
          record.phase === "boot.finalize.failed" ||
          record.phase === "boot.finalize.finished"
        )
        .map((record) => `${record.subjectId}:${record.phase}`),
    ).toEqual([
      "api:boot.finalize.failed",
      "database:boot.finalize.finished",
    ]);
  });

  test("rolls back started boot modules in reverse order after startup failure", async () => {
    const startLog: string[] = [];
    const rollbackLog: string[] = [];
    const result = await executeMiniBootgraph({
      modules: [
        {
          kind: "mini-runtime.boot-module",
          id: "api",
          dependencies: ["email"],
          start() {
            startLog.push("api");
            throw new Error("api failed to start");
          },
          rollback() {
            rollbackLog.push("api");
          },
        },
        {
          kind: "mini-runtime.boot-module",
          id: "clock",
          start() {
            startLog.push("clock");
            return { close() {} };
          },
          rollback() {
            rollbackLog.push("clock");
          },
        },
        {
          kind: "mini-runtime.boot-module",
          id: "email",
          dependencies: ["clock"],
          start() {
            startLog.push("email");
            return { close() {} };
          },
          rollback() {
            rollbackLog.push("email");
          },
        },
      ],
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") throw new Error("expected failed bootgraph");
    expect(result.startupOrder).toEqual(["clock", "email", "api"]);
    expect(startLog).toEqual(["clock", "email", "api"]);
    expect(result.rollbackOrder).toEqual(["email", "clock"]);
    expect(rollbackLog).toEqual(["email", "clock"]);
    expect(
      result.catalog.records
        .filter((record) => record.phase === "boot.rollback.finished")
        .map((record) => record.subjectId),
    ).toEqual(["email", "clock"]);
    assertNoLiveHandles(result.catalog);
  });

  test("rejects invalid bootgraph topology before startup", async () => {
    await expect(
      executeMiniBootgraph({
        modules: [
          {
            kind: "mini-runtime.boot-module",
            id: "api",
            dependencies: ["missing"],
            start() {
              throw new Error("should not start");
            },
          },
        ],
      }),
    ).rejects.toThrow("boot module api depends on missing module missing");

    await expect(
      executeMiniBootgraph({
        modules: [
          {
            kind: "mini-runtime.boot-module",
            id: "api",
            dependencies: ["email"],
            start() {
              throw new Error("should not start");
            },
          },
          {
            kind: "mini-runtime.boot-module",
            id: "email",
            dependencies: ["api"],
            start() {
              throw new Error("should not start");
            },
          },
        ],
      }),
    ).rejects.toThrow("bootgraph dependency cycle at api");
  });

  test("constructs service binding cache once and excludes invocation from identity", () => {
    const factoryCalls: string[] = [];
    const invocationTraces: string[] = [];
    const cache = createMiniServiceBindingCache<
      ConstructionBoundServiceClients<typeof WorkItemsServerApiServices>
    >({
      processId: "process-1",
      plans: PortableArtifact.serviceBindingPlans,
      createClient({ constructionIdentity }) {
        factoryCalls.push(constructionIdentity);
        return {
          workItems: {
            withInvocation(input) {
              invocationTraces.push(input.invocation.traceId);
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
                      id: "created-from-cache",
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
      },
    });

    const plan = PortableArtifact.serviceBindingPlans[0];
    if (!plan) throw new Error("missing fixture service binding plan");
    expect(factoryCalls).toEqual([]);
    const firstClient = cache.getOrCreate(plan);
    const secondClient = cache.getOrCreate({ ...plan });

    expect(firstClient).toBe(secondClient);
    firstClient.workItems.withInvocation({
      invocation: { traceId: "trace-a" },
    });
    secondClient.workItems.withInvocation({
      invocation: { traceId: "trace-b" },
    });

    expect(factoryCalls.map(parseConstructionIdentity)).toEqual([
      {
        capability: "work-items",
        configHash: "config:server:api:work-items",
        dependencyInstances: [],
        kind: "service.binding-construction",
        processId: "process-1",
        role: "server",
        scopeHash: "scope:server:api:work-items",
        serviceId: "work-items",
        serviceInstance: "default",
        surface: "api",
      },
    ]);
    expect(invocationTraces).toEqual(["trace-a", "trace-b"]);
    const cacheRecords = cache.records();
    expect(cacheRecords).toEqual([
      {
        kind: "service.binding-cache-record",
        serviceId: "work-items",
        role: "server",
        constructionIdentity: factoryCalls[0],
      },
    ]);
    expect(parseConstructionIdentity(cacheRecords[0]?.constructionIdentity ?? "")).toEqual({
      capability: "work-items",
      configHash: "config:server:api:work-items",
      dependencyInstances: [],
      kind: "service.binding-construction",
      processId: "process-1",
      role: "server",
      scopeHash: "scope:server:api:work-items",
      serviceId: "work-items",
      serviceInstance: "default",
      surface: "api",
    });
    expect(JSON.stringify(cache.records())).not.toContain("trace-a");
    expect(JSON.stringify(cache.records())).not.toContain("trace-b");
  });

  test("separates service binding cache entries by construction-time inputs", () => {
    const factoryCalls: string[] = [];
    const firstPlan = PortableArtifact.serviceBindingPlans[0];
    if (!firstPlan) throw new Error("missing fixture service binding plan");
    const secondPlan = {
      ...firstPlan,
      surface: "internal",
      capability: "work-items-ops",
      scopeHash: "scope:server:internal:work-items-ops",
      configHash: "config:server:internal:work-items-ops",
    };
    const cache = createMiniServiceBindingCache<{ readonly id: string }>({
      processId: "process-1",
      plans: [firstPlan, secondPlan],
      createClient({ constructionIdentity }) {
        factoryCalls.push(constructionIdentity);
        return { id: constructionIdentity };
      },
    });

    const first = cache.getOrCreate(firstPlan);
    const second = cache.getOrCreate(secondPlan);

    expect(first).not.toBe(second);
    expect(factoryCalls.map(parseConstructionIdentity)).toEqual([
      {
        capability: "work-items",
        configHash: "config:server:api:work-items",
        dependencyInstances: [],
        kind: "service.binding-construction",
        processId: "process-1",
        role: "server",
        scopeHash: "scope:server:api:work-items",
        serviceId: "work-items",
        serviceInstance: "default",
        surface: "api",
      },
      {
        capability: "work-items-ops",
        configHash: "config:server:internal:work-items-ops",
        dependencyInstances: [],
        kind: "service.binding-construction",
        processId: "process-1",
        role: "server",
        scopeHash: "scope:server:internal:work-items-ops",
        serviceId: "work-items",
        serviceInstance: "default",
        surface: "internal",
      },
    ]);
  });

  test("keeps service binding cache keys structurally encoded", () => {
    const firstPlan = PortableArtifact.serviceBindingPlans[0];
    if (!firstPlan) throw new Error("missing fixture service binding plan");
    const separatorPlan = {
      ...firstPlan,
      surface: "a:b",
      capability: "c",
      scopeHash: "scope:shared",
      configHash: "config:shared",
    };
    const equivalentJoinPlan = {
      ...firstPlan,
      surface: "a",
      capability: "b:c",
      scopeHash: "scope:shared",
      configHash: "config:shared",
    };
    const factoryCalls: string[] = [];
    const cache = createMiniServiceBindingCache<{ readonly id: string }>({
      processId: "process-1",
      plans: [separatorPlan, equivalentJoinPlan],
      createClient({ constructionIdentity }) {
        factoryCalls.push(constructionIdentity);
        return { id: constructionIdentity };
      },
    });

    const first = cache.getOrCreate(separatorPlan);
    const second = cache.getOrCreate(equivalentJoinPlan);

    expect(first).not.toBe(second);
    expect(factoryCalls).toHaveLength(2);
    expect(factoryCalls.map(parseConstructionIdentity)).toEqual([
      {
        capability: "c",
        configHash: "config:shared",
        dependencyInstances: [],
        kind: "service.binding-construction",
        processId: "process-1",
        role: "server",
        scopeHash: "scope:shared",
        serviceId: "work-items",
        serviceInstance: "default",
        surface: "a:b",
      },
      {
        capability: "b:c",
        configHash: "config:shared",
        dependencyInstances: [],
        kind: "service.binding-construction",
        processId: "process-1",
        role: "server",
        scopeHash: "scope:shared",
        serviceId: "work-items",
        serviceInstance: "default",
        surface: "a",
      },
    ]);
  });

  test("narrows runtime resource access to sanctioned lookup and redacted records", () => {
    const liveDatabaseHandle = {
      query() {
        return "ok";
      },
      secretToken: "live-database-secret",
    };
    const access = createMiniRuntimeResourceAccess([
      {
        id: "database",
        value: liveDatabaseHandle,
        metadata: {
          publicLabel: "database",
          secretToken: "catalog-secret",
          liveHandle: () => "not catalog safe",
        },
      },
    ]);

    expect(access.requireResource("database")).toBe(liveDatabaseHandle);
    expect(access.optionalResource("missing")).toBeUndefined();
    expect(() => access.requireResource("missing")).toThrow(
      "missing runtime resource: missing",
    );
    expect("resources" in access).toBe(false);
    expect("runtime" in access).toBe(false);
    expect("getRaw" in access).toBe(false);
    expect(access.resourceMetadata("database")).toEqual({
      publicLabel: "database",
      secretToken: "[redacted]",
      liveHandle: "[redacted]",
    });
    access.telemetry().event("runtime.resource.accessed", {
      publicLabel: "database",
      secretToken: "telemetry-secret",
    });
    access.emitTopology({
      kind: "runtime.surface-started",
      surface: "api",
      liveHandle: () => "not topology safe",
    });
    access.emitDiagnostic({
      code: "runtime.resource.probe",
      message: "resource probe",
      attributes: {
        publicLabel: "database",
        apiKey: "diagnostic-secret",
        liveHandle: () => "not diagnostic safe",
      },
    });
    expect(access.records()).toEqual([
      {
        kind: "runtime.resource-record",
        resourceId: "database",
        metadata: {
          publicLabel: "database",
          secretToken: "[redacted]",
          liveHandle: "[redacted]",
        },
      },
    ]);
    expect(access.telemetryEvents()).toEqual([
      {
        kind: "runtime.telemetry-event",
        name: "runtime.resource.accessed",
        attributes: {
          publicLabel: "database",
          secretToken: "[redacted]",
        },
      },
    ]);
    expect(access.topologyRecords()).toEqual([
      {
        kind: "runtime.topology-record",
        record: {
          kind: "runtime.surface-started",
          surface: "api",
          liveHandle: "[redacted]",
        },
      },
    ]);
    expect(access.diagnosticRecords()).toEqual([
      {
        kind: "runtime.diagnostic-record",
        code: "runtime.resource.probe",
        message: "resource probe",
        attributes: {
          publicLabel: "database",
          apiKey: "[redacted]",
          liveHandle: "[redacted]",
        },
      },
    ]);
    expect(JSON.stringify(access.records())).not.toContain("catalog-secret");
    expect(JSON.stringify(access.records())).not.toContain("live-database-secret");
    expect(JSON.stringify(access.telemetryEvents())).not.toContain("telemetry-secret");
    expect(JSON.stringify(access.diagnosticRecords())).not.toContain("diagnostic-secret");
    assertNoLiveHandles(access.records());
    assertNoLiveHandles(access.telemetryEvents());
    assertNoLiveHandles(access.topologyRecords());
    assertNoLiveHandles(access.diagnosticRecords());
  });

  test("deployment handoff is compile-only and carries no descriptor table", () => {
    const compiledProcessPlan: CompiledProcessPlan = {
      kind: "compiled.process-plan",
      appId: "hq",
      executionPlans: [CreateWorkItemPlan, SyncWorkItemStepPlan],
    };
    const handoff = createDeploymentRuntimeHandoff({
      portableArtifact: PortableArtifact,
      compiledProcessPlan,
    });

    expect(handoff.kind).toBe("deployment.runtime-handoff");
    expect(handoff.appId).toBe("hq");
    expect("descriptorTable" in handoff.portableArtifact).toBe(false);
    expect(handoff.compiledProcessPlan.executionPlans).toEqual([
      CreateWorkItemPlan,
      SyncWorkItemStepPlan,
    ]);
    expect(RuntimeFixtureProfile.kind).toBe("runtime.profile");
  });

  test("deployment handoff rejects widened non-portable runtime values", () => {
    const compiledProcessPlan: CompiledProcessPlan = {
      kind: "compiled.process-plan",
      appId: "hq",
      executionPlans: [CreateWorkItemPlan],
    };

    expect(() =>
      createDeploymentRuntimeHandoff({
        portableArtifact: {
          ...PortableArtifact,
          descriptorTable: createExecutionDescriptorTable([]),
        } as unknown as PortableRuntimePlanArtifact,
        compiledProcessPlan,
      }),
    ).toThrow("descriptorTable");

    expect(() =>
      createDeploymentRuntimeHandoff({
        portableArtifact: {
          ...PortableArtifact,
          diagnostics: [
            ...PortableArtifact.diagnostics,
            {
              code: "runtime.secret",
              message: "bad diagnostic",
              rawSecret: "secret",
            },
          ],
        } as unknown as PortableRuntimePlanArtifact,
        compiledProcessPlan,
      }),
    ).toThrow("rawSecret");

    expect(() =>
      createDeploymentRuntimeHandoff({
        portableArtifact: PortableArtifact,
        compiledProcessPlan: {
          ...compiledProcessPlan,
          runtimeAccess: createMiniRuntimeResourceAccess([]),
        } as unknown as CompiledProcessPlan,
      }),
    ).toThrow("runtimeAccess");

    expect(() =>
      createDeploymentRuntimeHandoff({
        portableArtifact: PortableArtifact,
        compiledProcessPlan: {
          ...compiledProcessPlan,
          appId: "other-app",
        },
      }),
    ).toThrow("appId mismatch");
  });
});
