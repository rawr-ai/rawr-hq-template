import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import type { WorkflowDispatcher } from "@rawr/sdk/spine";
import { SyncWorkItemStepDescriptor } from "../../../scenarios/work-items/app-and-plan-artifacts";
import {
  EmailProvider,
  WorkItemsRuntimeProfile,
} from "../../../scenarios/work-items/resource-provider-profile";
import { WorkItemsServerApiPlugin } from "../../../scenarios/work-items/server-api-plugin";
import type { WorkItem } from "../../../scenarios/work-items/work-items-service";
import {
  buildRuntimeTelemetryOtlpTracePayload,
  type ContainedRuntimeResourceDefinition,
  createContainedRuntimeResourceAccess,
  createDeploymentRuntimeHandoff,
  createExecutionRegistry,
  createMigrationControlPlaneObservationPacket,
  createProcessExecutionRuntime,
  createProviderProvisioningModules,
  createProviderProvisioningTrace,
  createRuntimeBoundaryPolicy,
  executeRuntimeBootgraph,
  exportRuntimeTelemetryOtlpTraces,
  mountOracleAsyncHarness,
  mountOracleServerHarness,
  mountRuntimeInngestAsyncBoundary,
  mountRuntimeOrpcServerBoundary,
  type ProcessExecutionRuntime,
  type ProviderProvisionedValue,
  projectRuntimeCatalogToTelemetryRecords,
  projectRuntimeEventsToTelemetryRecords,
  providerBootResourceModuleId,
  type RuntimeInngestAsyncStepResponse,
  type RuntimeOrpcServerResponse,
  type RuntimeTelemetryEventLike,
  type RuntimeTelemetryRecord,
} from "../../../src/oracle";
import type {
  AsyncStepBridgePayload,
  RuntimeSpineCompilation,
  ServerAdapterCallbackPayload,
} from "../../../src/spine/artifacts";
import { compileRuntimeSpine, deriveRuntimeSpine } from "../../../src/spine/simulate";

interface OrpcEncoded<T> {
  readonly json: T;
}

interface InngestStepRunOp<T> {
  readonly op: "StepRun";
  readonly name: string;
  readonly data: T;
}

interface InngestStepErrorOp {
  readonly op: "StepError";
  readonly name: string;
  readonly error: {
    readonly message?: string;
  };
}

function assertNoLiveHandles(value: unknown): void {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    throw new Error(`phase three started passage leaked live handle: ${String(value)}`);
  }

  if (value === null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const entry of value) assertNoLiveHandles(entry);
    return;
  }

  for (const entry of Object.values(value)) {
    assertNoLiveHandles(entry);
  }
}

function collectFunctionPaths(value: unknown, path = "$"): string[] {
  if (typeof value === "function") return [path];
  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectFunctionPaths(item, `${path}[${index}]`));
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
    collectFunctionPaths(entry, `${path}.${key}`)
  );
}

function deriveAndCompileSpine(): RuntimeSpineCompilation {
  return compileRuntimeSpine(
    deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      profile: WorkItemsRuntimeProfile,
      executions: [
        {
          kind: "runtime.execution-derivation-input",
          boundary: "plugin.server-api",
          executionId: "exec:server:work-items:create",
          role: "server",
          surface: "api",
          capability: "work-items",
          routePath: ["items", "create"],
          descriptor: WorkItemsServerApiPlugin.descriptors[0],
          policy: {
            timeoutMs: 1000,
          },
        },
        {
          kind: "runtime.execution-derivation-input",
          boundary: "plugin.async-step",
          executionId: "exec:async:work-items.sync:sync-work-item",
          role: "async",
          surface: "workflow",
          capability: "work-items",
          workflowId: "work-items.sync",
          stepId: "sync-work-item",
          descriptor: SyncWorkItemStepDescriptor,
          policy: {
            timeoutMs: 1000,
          },
        },
      ],
      serviceBindings: [
        {
          kind: "service.binding-derivation-input",
          serviceId: "work-items",
          role: "server",
          surface: "api",
          capability: "work-items",
          dependencyInstances: [],
          scopeHash: "scope:server:api:work-items",
          configHash: "config:server:api:work-items",
        },
      ],
      serverRoutes: [
        {
          kind: "server.route-derivation-input",
          routeFactoryId: "work-items.public-api",
          deriveRoutes() {
            return [
              {
                kind: "server.route-declaration",
                boundary: "plugin.server-api",
                role: "server",
                surface: "api",
                capability: "work-items",
                routePath: ["items", "create"],
                executionId: "exec:server:work-items:create",
                importSafety: "cold-declaration",
              },
            ];
          },
        },
      ],
      dispatchers: [
        {
          kind: "workflow.dispatcher-derivation-input",
          descriptorId: "dispatcher:work-items",
          role: "server",
          surface: "api",
          capability: "work-items",
          workflowIds: ["work-items.sync"],
          operations: [
            {
              operation: "dispatch",
              workflowId: "work-items.sync",
            },
          ],
        },
      ],
    })
  );
}

function serverPayloadFrom(compilation: RuntimeSpineCompilation): ServerAdapterCallbackPayload {
  const payload = compilation.adapterLoweringPlan.payloads.find(
    (entry): entry is ServerAdapterCallbackPayload =>
      entry.kind === "adapter.server-callback-payload"
  );
  if (!payload) throw new Error("missing phase three server payload");
  return payload;
}

function asyncPayloadFrom(compilation: RuntimeSpineCompilation): AsyncStepBridgePayload {
  const payload = compilation.adapterLoweringPlan.payloads.find(
    (entry): entry is AsyncStepBridgePayload => entry.kind === "adapter.async-step-bridge-payload"
  );
  if (!payload) throw new Error("missing phase three async payload");
  return payload;
}

function createClients(): ConstructionBoundServiceClients<
  typeof WorkItemsServerApiPlugin.services
> {
  return {
    workItems: {
      withInvocation() {
        return {
          items: {
            get(request) {
              return Effect.succeed({
                id: request.id,
                title: "Phase Three fixture item",
                status: "open",
              } satisfies WorkItem);
            },
            create(request) {
              return Effect.succeed({
                id: "created-via-phase-three-started-passage",
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

function providerResourcesFromStartedValues(
  startedValues: ReadonlyMap<string, unknown>
): readonly ContainedRuntimeResourceDefinition[] {
  return [...startedValues.values()].flatMap((started) => {
    const providerValue = started as ProviderProvisionedValue | undefined;
    if (!providerValue || providerValue.kind !== "provider.provisioned-value") {
      return [];
    }

    return [
      {
        id: providerValue.key.resourceId,
        value: providerValue.value,
        metadata: {
          providerId: providerValue.key.providerId,
          moduleId: providerBootResourceModuleId(providerValue.key),
          secretToken: "phase-three-resource-metadata-secret",
          liveHandle() {},
        },
      },
    ];
  });
}

function workflowDispatcher(): WorkflowDispatcher {
  return {
    kind: "workflow.dispatcher",
    async dispatch() {
      return { runId: "run-phase-three-started-passage" };
    },
  };
}

function createServerInvocationContext(resources: readonly ContainedRuntimeResourceDefinition[]) {
  return (request: { readonly input: unknown; readonly requestId?: string }) => ({
    input: request.input,
    context: {
      request: {
        async requireActor() {
          return { id: "actor-phase-three" };
        },
      },
      clients: createClients(),
      resources: createContainedRuntimeResourceAccess(resources),
      workflows: workflowDispatcher(),
    },
    telemetry: {
      event() {},
    },
    execution: {
      traceId: request.requestId ?? "trace-phase-three-started-passage",
      secretToken: "phase-three-server-execution-secret",
    },
  });
}

function createAsyncInvocationContext(resources: readonly ContainedRuntimeResourceDefinition[]) {
  return (event: { readonly name: string; readonly data: unknown }) => ({
    event: {
      name: event.name,
      data: event.data,
    },
    clients: {
      workItems: createClients().workItems.withInvocation({
        invocation: { traceId: "trace-phase-three-started-passage" },
      }),
    },
    resources: createContainedRuntimeResourceAccess(resources),
    workflows: workflowDispatcher(),
    telemetry: {
      event() {},
    },
    execution: {
      traceId: "trace-phase-three-started-passage",
      secretToken: "phase-three-async-execution-secret",
    },
  });
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

function recordEvent(record: object): RuntimeTelemetryEventLike {
  const attributes = record as Record<string, unknown>;
  const name =
    typeof attributes.phase === "string"
      ? attributes.phase
      : typeof attributes.name === "string"
        ? attributes.name
        : "runtime.record";

  return { name, attributes };
}

function appendTelemetryRecords(
  records: RuntimeTelemetryRecord[],
  input: {
    readonly source: string;
    readonly runId: string;
    readonly events: readonly RuntimeTelemetryEventLike[];
  }
) {
  records.push(
    ...projectRuntimeEventsToTelemetryRecords({
      ...input,
      startingSequence: records.length,
    })
  );
}

async function suppressExpectedInngestStoppedError<T>(task: () => Promise<T>): Promise<T> {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const text = args.map(String).join("\n");
    if (text.includes("async harness async:hq:phase-three-started is stopped")) {
      return;
    }
    originalError(...args);
  };

  try {
    return await task();
  } finally {
    console.error = originalError;
  }
}

describe("phase three started process assembly stop finalization passage", () => {
  test("starts invokes observes stops finalizes and rejects post-stop boundary calls", async () => {
    const runId = "phase-three-started-process-passage";
    const traceId = "99998888777766665555444433332222";
    const compilation = deriveAndCompileSpine();
    const serverPayload = serverPayloadFrom(compilation);
    const asyncPayload = asyncPayloadFrom(compilation);
    const providerTrace = createProviderProvisioningTrace();

    expect(compilation.appId).toBe("hq");
    expect(compilation.portableArtifact.executionDescriptorRefs).toHaveLength(2);
    expect(collectFunctionPaths(compilation.portableArtifact)).toEqual([]);
    expect(compilation.adapterLoweringPlan.diagnostics).toEqual([]);
    expect(compilation.harnessPlans.map((plan) => plan.harness)).toEqual(["server", "async"]);

    if (!compilation.providerDependencyGraph) {
      throw new Error("phase three passage expected provider dependency graph");
    }

    const providerModules = createProviderProvisioningModules({
      profileId: WorkItemsRuntimeProfile.id,
      providerSelections: WorkItemsRuntimeProfile.providerSelections,
      providerDependencyGraph: compilation.providerDependencyGraph,
      processId: "phase-three-started-process",
      trace: providerTrace,
      configs: {
        [EmailProvider.id]: {
          from: "phase-three@example.com",
          token: "phase-three-email-config-secret",
          liveHandle() {},
        },
      },
      boundaryPolicy({ phase, key }) {
        return createRuntimeBoundaryPolicy({
          policyId: `phase-three:${phase}:${key.providerId}`,
          boundary: phase === "acquire" ? "provider.acquire" : "provider.release",
          subjectId: providerBootResourceModuleId(key),
          metadata: {
            providerId: key.providerId,
            secretToken: "phase-three-provider-policy-secret",
          },
        });
      },
    });
    const providerResult = await executeRuntimeBootgraph({ modules: providerModules });
    expect(providerResult.status).toBe("started");
    if (providerResult.status !== "started") throw providerResult.error;

    const registry = createExecutionRegistry({
      plans: compilation.registryInput.executionPlans,
      descriptorTable: compilation.registryInput.descriptorTable,
    });
    const runtime = createProcessExecutionRuntime({ registry });
    let runtimeInvokeCount = 0;
    let runtimeDisposed = false;
    const countedRuntime: ProcessExecutionRuntime = {
      kind: runtime.kind,
      invoke(input) {
        runtimeInvokeCount += 1;
        return runtime.invoke(input);
      },
      dispose() {
        runtimeDisposed = true;
        return runtime.dispose();
      },
    };
    const resources = providerResourcesFromStartedValues(providerResult.startedValues());
    const serverHarness = mountOracleServerHarness({
      harnessId: "server:hq:phase-three-started",
      runtime: countedRuntime,
      payloads: [serverPayload],
    });
    const asyncHarness = mountOracleAsyncHarness({
      harnessId: "async:hq:phase-three-started",
      runtime: countedRuntime,
      payloads: [asyncPayload],
    });
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:phase-three-started",
      prefix: "/rpc",
      payload: serverPayload,
      harness: serverHarness,
      createInvocationContext: createServerInvocationContext(resources),
    });
    const asyncBoundary = mountRuntimeInngestAsyncBoundary({
      boundaryId: "inngest:hq:phase-three-started",
      clientId: "rawr-runtime-realization-lab",
      functionId: "work-items-phase-three-started",
      eventName: "rawr/work-item.sync",
      payload: asyncPayload,
      harness: asyncHarness,
      createInvocationContext: createAsyncInvocationContext(resources),
    });
    let serverStopped = false;
    let asyncStopped = false;
    let providersFinalized = false;

    try {
      const serverResult = await serverBoundary.handle(
        createOrpcRpcRequest({
          executionId: serverPayload.ref.executionId,
          requestId: traceId,
          input: {
            title: "Phase Three started passage",
            secretToken: "phase-three-server-request-secret",
          },
        })
      );
      expect(serverResult.matched).toBe(true);
      expect(serverResult.response.status).toBe(200);
      const serverBody =
        (await serverResult.response.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;

      const asyncResponse = await asyncBoundary.handle(
        asyncBoundary.createRequest({
          runId,
          eventData: {
            itemId: "item-1",
            requestedBy: "actor-phase-three",
            secretToken: "phase-three-async-event-secret",
          },
        })
      );
      expect(asyncResponse.status).toBe(206);
      const asyncBody =
        (await asyncResponse.json()) as readonly InngestStepRunOp<RuntimeInngestAsyncStepResponse>[];
      const asyncStep = asyncBody[0];
      if (!asyncStep) throw new Error("missing phase three async step");

      expect(runtimeInvokeCount).toBe(2);
      await asyncHarness.stop();
      asyncStopped = true;
      await serverHarness.stop();
      serverStopped = true;
      await providerResult.finalize();
      providersFinalized = true;
      await countedRuntime.dispose();
      expect(runtimeDisposed).toBe(true);

      const invokeCountAfterStop = runtimeInvokeCount;
      const postStopServerResult = await serverBoundary.handle(
        createOrpcRpcRequest({
          executionId: serverPayload.ref.executionId,
          requestId: `${traceId}-post-stop`,
          input: {
            title: "Phase Three post-stop server",
            secretToken: "phase-three-post-stop-server-secret",
          },
        })
      );
      expect(postStopServerResult.matched).toBe(true);
      expect(postStopServerResult.response.status).toBeGreaterThanOrEqual(400);

      const postStopAsyncResponse = await suppressExpectedInngestStoppedError(() =>
        asyncBoundary.handle(
          asyncBoundary.createRequest({
            runId: `${runId}:post-stop`,
            eventData: {
              itemId: "item-1",
              requestedBy: "actor-phase-three",
              secretToken: "phase-three-post-stop-async-secret",
            },
          })
        )
      );
      expect(postStopAsyncResponse.status).toBe(206);
      const postStopAsyncBody =
        (await postStopAsyncResponse.json()) as readonly InngestStepErrorOp[];
      expect(postStopAsyncBody[0]).toMatchObject({
        op: "StepError",
        name: asyncPayload.stepId,
        error: {
          message: "async harness async:hq:phase-three-started is stopped",
        },
      });
      expect(runtimeInvokeCount).toBe(invokeCountAfterStop);

      expect(serverHarness.records().map((record) => record.phase)).toEqual([
        "harness.start",
        "harness.invoke.start",
        "harness.invoke.finished",
        "harness.stop",
        "harness.invoke.failed",
      ]);
      expect(asyncHarness.records().map((record) => record.phase)).toEqual([
        "harness.start",
        "harness.invoke.start",
        "harness.invoke.finished",
        "harness.stop",
        "harness.invoke.failed",
      ]);
      expect(serverHarness.records().at(-1)).toMatchObject({
        phase: "harness.invoke.failed",
        status: "stopped",
      });
      expect(asyncHarness.records().at(-1)).toMatchObject({
        phase: "harness.invoke.failed",
        status: "stopped",
      });
      expect(asyncBoundary.records().at(-1)).toMatchObject({
        phase: "inngest.serve.responded",
        status: "failure",
        httpStatus: 206,
      });

      const telemetryRecords: RuntimeTelemetryRecord[] = [];
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.started.provider",
        runId,
        events: providerTrace.events,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.started.server.runtime",
        runId,
        events: serverBody.json.runtimeEvents,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.started.server.orpc",
        runId,
        events: serverBoundary.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.started.server.harness",
        runId,
        events: serverHarness.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.started.async.runtime",
        runId,
        events: asyncStep.data.runtimeEvents,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.started.async.inngest",
        runId,
        events: asyncBoundary.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.started.async.harness",
        runId,
        events: asyncHarness.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.started.runtime.lifecycle",
        runId,
        events: [
          {
            name: "runtime.dispose.finished",
            attributes: {
              runtimeDisposed,
            },
          },
        ],
      });
      telemetryRecords.push(
        ...projectRuntimeCatalogToTelemetryRecords({
          source: "phase-three.started.catalog",
          runId,
          catalog: providerResult.catalog(),
          startingSequence: telemetryRecords.length,
        })
      );

      let exportedEndpoint = "";
      const payload = buildRuntimeTelemetryOtlpTracePayload({
        serviceName: "runtime-realization-type-env",
        runId,
        traceId,
        records: telemetryRecords,
      });
      const exportResult = await exportRuntimeTelemetryOtlpTraces({
        endpoint: "http://127.0.0.1:4318",
        payload,
        fetch: async (url) => {
          exportedEndpoint = url;
          return {
            status: 200,
            statusText: "OK",
            async text() {
              return "{}";
            },
          };
        },
      });
      const packet = createMigrationControlPlaneObservationPacket({
        deploymentHandoff: createDeploymentRuntimeHandoff({
          portableArtifact: compilation.portableArtifact,
          compiledProcessPlan: compilation.compiledProcessPlan,
        }),
        catalog: providerResult.catalog(),
        runId,
        traceId,
        telemetryRecords,
        telemetryExport: exportResult,
        correlationId: traceId,
        placementCandidates: [
          {
            targetId: "candidate:phase-three-started",
            role: "server",
            surface: "api",
            reason: "phase three started passage remains candidate-only",
            attributes: {
              secretToken: "phase-three-placement-secret",
              liveHandle() {},
            },
          },
        ],
      });

      const payloadJson = JSON.stringify(payload);
      const packetJson = JSON.stringify(packet);
      expect(serverBody.json.output).toEqual({
        id: "created-via-phase-three-started-passage",
        title: "Phase Three started passage",
        status: "open",
      });
      expect(asyncStep.data.output).toEqual({ synced: true });
      expect(exportedEndpoint).toBe("http://127.0.0.1:4318/v1/traces");
      expect(packet.telemetry.export?.status).toBe("accepted");
      expect(packet.placementCandidates[0]?.decision).toBe("candidate-only");
      expect(packet.telemetry.sources).toEqual(
        expect.arrayContaining([
          "phase-three.started.provider",
          "phase-three.started.server.runtime",
          "phase-three.started.server.orpc",
          "phase-three.started.server.harness",
          "phase-three.started.async.runtime",
          "phase-three.started.async.inngest",
          "phase-three.started.async.harness",
          "phase-three.started.runtime.lifecycle",
          "phase-three.started.catalog",
        ])
      );
      expect(payloadJson).toContain("provider.acquire");
      expect(payloadJson).toContain("boot.finalize.finished");
      expect(payloadJson).toContain("harness.stop");
      expect(payloadJson).toContain("harness.invoke.failed");
      expect(payloadJson).toContain("stopped");
      expect(payloadJson).toContain("orpc.fetch.received");
      expect(payloadJson).toContain("inngest.serve.responded");
      expect(payloadJson).toContain("runtime.invoke.success");
      expect(payloadJson).toContain("runtime.dispose.finished");

      for (const secret of [
        "phase-three-email-config-secret",
        "phase-three-provider-policy-secret",
        "phase-three-resource-metadata-secret",
        "phase-three-server-execution-secret",
        "phase-three-server-request-secret",
        "phase-three-async-execution-secret",
        "phase-three-async-event-secret",
        "phase-three-post-stop-server-secret",
        "phase-three-post-stop-async-secret",
        "phase-three-placement-secret",
      ]) {
        expect(payloadJson).not.toContain(secret);
        expect(packetJson).not.toContain(secret);
      }
      expect(packetJson).not.toContain("resourceSpans");
      assertNoLiveHandles(payload);
      assertNoLiveHandles(packet);
    } finally {
      if (!asyncStopped) {
        await asyncHarness.stop();
      }
      if (!serverStopped) {
        await serverHarness.stop();
      }
      if (!providersFinalized) {
        await providerResult.finalize();
      }
      if (!runtimeDisposed) {
        await countedRuntime.dispose();
      }
    }
  });
});
