import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import type { ExecutionDescriptor, WorkflowDispatcher } from "@rawr/sdk/spine";
import {
  buildRuntimeTelemetryOtlpTracePayload,
  createDeploymentRuntimeHandoff,
  createExecutionRegistry,
  createMigrationControlPlaneObservationPacket,
  createManagedEffectRuntimeAccess,
  createOracleResourceAccess,
  createProcessExecutionRuntime,
  createProviderProvisioningModules,
  createProviderProvisioningTrace,
  createRuntimeBoundaryPolicy,
  executeOracleBootgraph,
  exportRuntimeTelemetryOtlpTraces,
  mountOracleAsyncHarness,
  mountOracleServerHarness,
  mountRuntimeElysiaHostBoundary,
  mountRuntimeInngestAsyncBoundary,
  mountRuntimeOrpcServerBoundary,
  projectRuntimeCatalogToTelemetryRecords,
  projectRuntimeEventsToTelemetryRecords,
  providerBootResourceModuleId,
  startRuntimeElysiaListener,
  type EffectRuntimeAccess,
  type OracleResourceAccessProbe,
  type OracleResourceDefinition,
  type ProcessExecutionRuntime,
  type ProviderProvisionedValue,
  type RuntimeInngestAsyncStepResponse,
  type RuntimeOrpcServerResponse,
  type RuntimeTelemetryEventLike,
  type RuntimeTelemetryRecord,
  type StartedRuntimeElysiaListener,
} from "../../../src/oracle";
import {
  compileRuntimeSpine,
  deriveRuntimeSpine,
} from "../../../src/spine/simulate";
import type {
  AsyncStepBridgePayload,
  RuntimeSpineCompilation,
  ServerAdapterCallbackPayload,
} from "../../../src/spine/artifacts";
import {
  CreateWorkItemRef,
  SyncWorkItemStepDescriptor,
} from "../../../scenarios/work-items/app-and-plan-artifacts";
import {
  EmailProvider,
  EmailSenderResource,
  RuntimeFixtureProfile,
} from "../../../scenarios/work-items/resource-provider-profile";
import { WorkItemsServerApiPlugin } from "../../../scenarios/work-items/server-api-plugin";
import type { WorkItem } from "../../../scenarios/work-items/work-items-service";

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
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new Error(
      `phase three integrated passage leaked live handle: ${String(value)}`,
    );
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
    return value.flatMap((item, index) =>
      collectFunctionPaths(item, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
    collectFunctionPaths(entry, `${path}.${key}`),
  );
}

function deriveAndCompileSpine(): RuntimeSpineCompilation {
  const serverDescriptor = {
    kind: "execution.descriptor",
    ref: CreateWorkItemRef,
    run(input) {
      const invocation = input as {
        readonly context: {
          readonly resources: OracleResourceAccessProbe;
        };
      };
      invocation.context.resources.requireResource(EmailSenderResource.id);
      return WorkItemsServerApiPlugin.descriptors[0].run(input as never);
    },
  } as const satisfies ExecutionDescriptor;
  const asyncDescriptor = {
    kind: "execution.descriptor",
    ref: SyncWorkItemStepDescriptor.ref,
    run(input) {
      const invocation = input as {
        readonly resources: OracleResourceAccessProbe;
      };
      invocation.resources.requireResource(EmailSenderResource.id);
      return SyncWorkItemStepDescriptor.run(input as never);
    },
  } as const satisfies ExecutionDescriptor;

  return compileRuntimeSpine(
    deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      profile: RuntimeFixtureProfile,
      executions: [
        {
          kind: "runtime.execution-derivation-input",
          boundary: "plugin.server-api",
          executionId: "exec:server:work-items:create",
          role: "server",
          surface: "api",
          capability: "work-items",
          routePath: ["items", "create"],
          descriptor: serverDescriptor,
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
          descriptor: asyncDescriptor,
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
    }),
  );
}

function serverPayloadFrom(
  compilation: RuntimeSpineCompilation,
): ServerAdapterCallbackPayload {
  const payload = compilation.adapterLoweringPlan.payloads.find(
    (entry): entry is ServerAdapterCallbackPayload =>
      entry.kind === "adapter.server-callback-payload",
  );
  if (!payload) throw new Error("missing integrated live-passage server payload");
  return payload;
}

function asyncPayloadFrom(
  compilation: RuntimeSpineCompilation,
): AsyncStepBridgePayload {
  const payload = compilation.adapterLoweringPlan.payloads.find(
    (entry): entry is AsyncStepBridgePayload =>
      entry.kind === "adapter.async-step-bridge-payload",
  );
  if (!payload) throw new Error("missing integrated live-passage async payload");
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
                title: "Phase Three integrated fixture item",
                status: "open",
              } satisfies WorkItem);
            },
            create(request) {
              return Effect.succeed({
                id: "created-via-phase-three-integrated-live-passage",
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
  startedValues: ReadonlyMap<string, unknown>,
): readonly OracleResourceDefinition[] {
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
          secretToken: "phase-three-integrated-resource-metadata-secret",
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
      return { runId: "run-phase-three-integrated-live-passage" };
    },
  };
}

function createObservedResourceAccess(
  resources: readonly OracleResourceDefinition[],
  onAvailableResources?: (records: readonly string[]) => void,
  onRequiredResource?: (resourceId: string) => void,
): OracleResourceAccessProbe {
  const resourceAccess = createOracleResourceAccess(resources);
  onAvailableResources?.(
    resourceAccess.records().map((record) => record.resourceId),
  );

  return {
    kind: resourceAccess.kind,
    requireResource<TValue = unknown>(resourceId: string): TValue {
      const value = resourceAccess.requireResource<TValue>(resourceId);
      onRequiredResource?.(resourceId);
      return value;
    },
    optionalResource<TValue = unknown>(resourceId: string): TValue | undefined {
      return resourceAccess.optionalResource<TValue>(resourceId);
    },
    resourceMetadata(resourceId: string) {
      return resourceAccess.resourceMetadata(resourceId);
    },
    telemetry() {
      return resourceAccess.telemetry();
    },
    emitTopology(record) {
      resourceAccess.emitTopology(record);
    },
    emitDiagnostic(diagnostic) {
      resourceAccess.emitDiagnostic(diagnostic);
    },
    records() {
      return resourceAccess.records();
    },
    topologyRecords() {
      return resourceAccess.topologyRecords();
    },
    diagnosticRecords() {
      return resourceAccess.diagnosticRecords();
    },
    telemetryEvents() {
      return resourceAccess.telemetryEvents();
    },
  } satisfies OracleResourceAccessProbe;
}

function createServerInvocationContext(
  resources: readonly OracleResourceDefinition[],
  onAvailableResources?: (records: readonly string[]) => void,
  onRequiredResource?: (resourceId: string) => void,
) {
  return (request: { readonly input: unknown; readonly requestId?: string }) => {
    const resourceAccess = createObservedResourceAccess(
      resources,
      onAvailableResources,
      onRequiredResource,
    );

    return {
      input: request.input,
      context: {
        request: {
          async requireActor() {
            return { id: "actor-phase-three-integrated" };
          },
        },
        clients: createClients(),
        resources: resourceAccess,
        workflows: workflowDispatcher(),
      },
      telemetry: {
        event() {},
      },
      execution: {
        traceId: request.requestId ?? "trace-phase-three-integrated-live-passage",
        secretToken: "phase-three-integrated-server-execution-secret",
      },
    };
  };
}

function createAsyncInvocationContext(
  resources: readonly OracleResourceDefinition[],
  onAvailableResources?: (records: readonly string[]) => void,
  onRequiredResource?: (resourceId: string) => void,
) {
  return (event: { readonly name: string; readonly data: unknown }) => {
    const resourceAccess = createObservedResourceAccess(
      resources,
      onAvailableResources,
      onRequiredResource,
    );

    return {
      event: {
        name: event.name,
        data: event.data,
      },
      clients: {
        workItems: createClients().workItems.withInvocation({
          invocation: { traceId: "trace-phase-three-integrated-live-passage" },
        }),
      },
      resources: resourceAccess,
      workflows: workflowDispatcher(),
      telemetry: {
        event() {},
      },
      execution: {
        traceId: "trace-phase-three-integrated-live-passage",
        secretToken: "phase-three-integrated-async-execution-secret",
      },
    };
  };
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

function createOrpcRpcInit(input: unknown): RequestInit {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-integrated-secret-token": "phase-three-integrated-listener-header-secret",
    },
    body: JSON.stringify({ json: input }),
  };
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
  },
) {
  records.push(
    ...projectRuntimeEventsToTelemetryRecords({
      ...input,
      startingSequence: records.length,
    }),
  );
}

async function suppressExpectedInngestStoppedError<T>(
  task: () => Promise<T>,
): Promise<T> {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const text = args.map(String).join("\n");
    if (
      text.includes(
        "async harness async:hq:phase-three-integrated-live-passage is stopped",
      )
    ) {
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

describe("phase three integrated live-passage rehearsal", () => {
  test("composes local Elysia listener, oRPC, async, provider lifecycle, telemetry, and post-stop rejection", async () => {
    const runId = "phase-three-integrated-live-passage";
    const traceId = "aa11bb22cc33dd44ee55ff6677889900";
    const compilation = deriveAndCompileSpine();
    const serverPayload = serverPayloadFrom(compilation);
    const asyncPayload = asyncPayloadFrom(compilation);
    const providerTrace = createProviderProvisioningTrace();
    const originalFetch = globalThis.fetch;
    const networkFetchUrls: string[] = [];
    const effectRuntime = createManagedEffectRuntimeAccess();
    let effectRuntimeRunCount = 0;
    let effectRuntimeDisposed = false;
    const countedEffectRuntime: EffectRuntimeAccess = {
      kind: effectRuntime.kind,
      runPromiseExit(effect, options) {
        effectRuntimeRunCount += 1;
        return effectRuntime.runPromiseExit(effect, options);
      },
      dispose() {
        effectRuntimeDisposed = true;
        return effectRuntime.dispose();
      },
    };

    expect(compilation.appId).toBe("hq");
    expect(compilation.portableArtifact.executionDescriptorRefs).toHaveLength(2);
    expect(collectFunctionPaths(compilation.portableArtifact)).toEqual([]);
    expect(compilation.adapterLoweringPlan.diagnostics).toEqual([]);
    expect(compilation.harnessPlans.map((plan) => plan.harness)).toEqual([
      "server",
      "async",
    ]);

    if (!compilation.providerDependencyGraph) {
      throw new Error("integrated passage expected provider dependency graph");
    }

    const providerModules = createProviderProvisioningModules({
      profileId: RuntimeFixtureProfile.id,
      providerSelections: RuntimeFixtureProfile.providerSelections,
      providerDependencyGraph: compilation.providerDependencyGraph,
      processId: "phase-three-integrated-live-passage",
      trace: providerTrace,
      effectRuntime: countedEffectRuntime,
      configs: {
        [EmailProvider.id]: {
          from: "phase-three-integrated@example.com",
          token: "phase-three-integrated-email-config-secret",
          liveHandle() {},
        },
      },
      boundaryPolicy({ phase, key }) {
        return createRuntimeBoundaryPolicy({
          policyId: `phase-three-integrated:${phase}:${key.providerId}`,
          boundary: phase === "acquire" ? "provider.acquire" : "provider.release",
          subjectId: providerBootResourceModuleId(key),
          metadata: {
            providerId: key.providerId,
            secretToken: "phase-three-integrated-provider-policy-secret",
          },
        });
      },
    });
    const providerResult = await executeOracleBootgraph({ modules: providerModules });
    expect(providerResult.status).toBe("started");
    if (providerResult.status !== "started") throw providerResult.error;
    const effectRunCountAfterProviderStart = effectRuntimeRunCount;
    expect(effectRunCountAfterProviderStart).toBeGreaterThanOrEqual(2);

    const registry = createExecutionRegistry({
      plans: compilation.registryInput.executionPlans,
      descriptorTable: compilation.registryInput.descriptorTable,
    });
    const runtime = createProcessExecutionRuntime({
      registry,
      effectRuntime: countedEffectRuntime,
    });
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

    const resources = providerResourcesFromStartedValues(
      providerResult.startedValues(),
    );
    const expectedResourceIds = resources.map((resource) => resource.id).sort();
    expect(expectedResourceIds).not.toEqual([]);

    const serverAvailableResourceSnapshots: readonly string[][] = [];
    const asyncAvailableResourceSnapshots: readonly string[][] = [];
    const serverRequiredResourceIds: string[] = [];
    const asyncRequiredResourceIds: string[] = [];
    const serverContext = createServerInvocationContext(
      resources,
      (resourceIds) => {
        serverAvailableResourceSnapshots.push([...resourceIds].sort());
      },
      (resourceId) => {
        serverRequiredResourceIds.push(resourceId);
      },
    );
    const asyncContext = createAsyncInvocationContext(
      resources,
      (resourceIds) => {
        asyncAvailableResourceSnapshots.push([...resourceIds].sort());
      },
      (resourceId) => {
        asyncRequiredResourceIds.push(resourceId);
      },
    );
    const serverHarness = mountOracleServerHarness({
      harnessId: "server:hq:phase-three-integrated-live-passage",
      runtime: countedRuntime,
      payloads: [serverPayload],
    });
    const asyncHarness = mountOracleAsyncHarness({
      harnessId: "async:hq:phase-three-integrated-live-passage",
      runtime: countedRuntime,
      payloads: [asyncPayload],
    });
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:phase-three-integrated-live-passage",
      prefix: "/rpc",
      payload: serverPayload,
      harness: serverHarness,
      createInvocationContext: serverContext,
    });
    const host = mountRuntimeElysiaHostBoundary({
      hostId: "elysia:hq:phase-three-integrated-live-passage",
      prefix: "/rpc",
      serverBoundary,
    });
    const asyncBoundary = mountRuntimeInngestAsyncBoundary({
      boundaryId: "inngest:hq:phase-three-integrated-live-passage",
      clientId: "rawr-runtime-realization-lab",
      functionId: "work-items-phase-three-integrated-live-passage",
      eventName: "rawr/work-item.sync",
      payload: asyncPayload,
      harness: asyncHarness,
      createInvocationContext: asyncContext,
    });

    let listener: StartedRuntimeElysiaListener | undefined;
    let listenerStopped = false;
    let serverStopped = false;
    let asyncStopped = false;
    let providersFinalized = false;

    try {
      globalThis.fetch = ((input, init) => {
        networkFetchUrls.push(String(input));
        return originalFetch(input, init);
      }) as typeof fetch;

      listener = startRuntimeElysiaListener({
        listenerId: "listener:hq:phase-three-integrated-live-passage",
        host,
      });
      expect(listener.hostname).toBe("127.0.0.1");
      expect(listener.port).toBeGreaterThan(0);
      expect(listener.url.protocol).toBe("http:");
      expect(host.app.server).not.toBeNull();

      const requestUrl = new URL("/rpc/invoke", listener.url);
      const response = await globalThis.fetch(
        requestUrl,
        createOrpcRpcInit({
          executionId: serverPayload.ref.executionId,
          requestId: traceId,
          input: {
            title: "Phase Three integrated live passage",
            secretToken: "phase-three-integrated-server-request-secret",
          },
        }),
      );
      expect(response.status).toBe(200);
      const serverBody =
        (await response.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;
      expect(serverBody.json.output).toEqual({
        id: "created-via-phase-three-integrated-live-passage",
        title: "Phase Three integrated live passage",
        status: "open",
      });

      const asyncResponse = await asyncBoundary.handle(
        asyncBoundary.createRequest({
          runId,
          eventData: {
            itemId: "item-1",
            requestedBy: "actor-phase-three-integrated",
            secretToken: "phase-three-integrated-async-event-secret",
          },
        }),
      );
      expect(asyncResponse.status).toBe(206);
      const asyncBody =
        (await asyncResponse.json()) as readonly InngestStepRunOp<RuntimeInngestAsyncStepResponse>[];
      const asyncStep = asyncBody[0];
      if (!asyncStep) {
        throw new Error("missing phase three integrated async step");
      }
      expect(asyncStep.data.output).toEqual({ synced: true });

      expect(runtimeInvokeCount).toBe(2);
      expect(effectRuntimeRunCount).toBeGreaterThanOrEqual(
        effectRunCountAfterProviderStart + 2,
      );
      expect(serverAvailableResourceSnapshots).toEqual([expectedResourceIds]);
      expect(asyncAvailableResourceSnapshots).toEqual([expectedResourceIds]);
      expect(serverRequiredResourceIds).toEqual([EmailSenderResource.id]);
      expect(asyncRequiredResourceIds).toEqual([EmailSenderResource.id]);
      expect(networkFetchUrls).toEqual([String(requestUrl)]);
      expect(listener.records().map((record) => record.phase)).toEqual([
        "elysia.listener.starting",
        "elysia.listener.vendor.started",
        "elysia.listener.started",
        "elysia.listener.network.request.start",
      ]);
      expect(host.records().map((record) => record.phase)).toEqual([
        "elysia.host.received",
        "elysia.host.delegate.start",
        "elysia.host.delegate.finished",
      ]);
      expect(serverBoundary.records().map((record) => record.phase)).toEqual([
        "orpc.fetch.received",
        "orpc.handler.enter",
        "orpc.handler.finished",
        "orpc.fetch.matched",
      ]);

      const countsBeforeListenerStop = {
        listener: listener.records().length,
        host: host.records().length,
        serverBoundary: serverBoundary.records().length,
        serverHarness: serverHarness.records().length,
        asyncBoundary: asyncBoundary.records().length,
        asyncHarness: asyncHarness.records().length,
        runtimeInvokeCount,
      };

      await listener.stop(true);
      listenerStopped = true;
      expect(host.app.server).toBeNull();
      await expect(
        globalThis.fetch(
          requestUrl,
          createOrpcRpcInit({
            executionId: serverPayload.ref.executionId,
            requestId: `${traceId}-post-listener-stop`,
            input: {
              title: "should not delegate after listener stop",
              secretToken: "phase-three-integrated-post-listener-secret",
            },
          }),
        ),
      ).rejects.toThrow();
      expect(networkFetchUrls).toEqual([
        String(requestUrl),
        String(requestUrl),
      ]);
      expect(listener.records().slice(countsBeforeListenerStop.listener).map((record) => record.phase)).toEqual([
        "elysia.listener.stopping",
        "elysia.listener.vendor.stopped",
        "elysia.listener.stopped",
      ]);
      expect(host.records()).toHaveLength(countsBeforeListenerStop.host);
      expect(serverBoundary.records()).toHaveLength(
        countsBeforeListenerStop.serverBoundary,
      );
      expect(serverHarness.records()).toHaveLength(
        countsBeforeListenerStop.serverHarness,
      );
      expect(asyncBoundary.records()).toHaveLength(
        countsBeforeListenerStop.asyncBoundary,
      );
      expect(asyncHarness.records()).toHaveLength(
        countsBeforeListenerStop.asyncHarness,
      );
      expect(runtimeInvokeCount).toBe(countsBeforeListenerStop.runtimeInvokeCount);

      await asyncHarness.stop();
      asyncStopped = true;
      await serverHarness.stop();
      serverStopped = true;
      await providerResult.finalize();
      providersFinalized = true;
      await countedRuntime.dispose();
      expect(runtimeDisposed).toBe(true);
      expect(effectRuntimeDisposed).toBe(true);
      expect(effectRuntimeRunCount).toBeGreaterThanOrEqual(
        effectRunCountAfterProviderStart + 2,
      );

      const invokeCountAfterStop = runtimeInvokeCount;
      const postStopServerResult = await serverBoundary.handle(
        createOrpcRpcRequest({
          executionId: serverPayload.ref.executionId,
          requestId: `${traceId}-post-stop-server`,
          input: {
            title: "Phase Three integrated post-stop server",
            secretToken: "phase-three-integrated-post-stop-server-secret",
          },
        }),
      );
      expect(postStopServerResult.matched).toBe(true);
      expect(postStopServerResult.response.status).toBeGreaterThanOrEqual(400);

      const postStopAsyncResponse = await suppressExpectedInngestStoppedError(
        () =>
          asyncBoundary.handle(
            asyncBoundary.createRequest({
              runId: `${runId}:post-stop`,
              eventData: {
                itemId: "item-1",
                requestedBy: "actor-phase-three-integrated",
                secretToken: "phase-three-integrated-post-stop-async-secret",
              },
            }),
          ),
      );
      expect(postStopAsyncResponse.status).toBe(206);
      const postStopAsyncBody =
        (await postStopAsyncResponse.json()) as readonly InngestStepErrorOp[];
      expect(postStopAsyncBody[0]).toMatchObject({
        op: "StepError",
        name: asyncPayload.stepId,
        error: {
          message:
            "async harness async:hq:phase-three-integrated-live-passage is stopped",
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
      expect(asyncBoundary.records().at(-1)).toMatchObject({
        phase: "inngest.serve.responded",
        status: "failure",
        httpStatus: 206,
      });

      const telemetryRecords: RuntimeTelemetryRecord[] = [];
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.provider",
        runId,
        events: providerTrace.events,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.listener",
        runId,
        events: listener.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.elysia-host",
        runId,
        events: host.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.server.orpc",
        runId,
        events: serverBoundary.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.server.runtime",
        runId,
        events: serverBody.json.runtimeEvents,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.server.adapter",
        runId,
        events: serverBody.json.adapterEvents.map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.server.harness",
        runId,
        events: serverHarness.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.async.runtime",
        runId,
        events: asyncStep.data.runtimeEvents,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.async.inngest",
        runId,
        events: asyncBoundary.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.async.harness",
        runId,
        events: asyncHarness.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.integrated.runtime.lifecycle",
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
          source: "phase-three.integrated.catalog",
          runId,
          catalog: providerResult.catalog(),
          startingSequence: telemetryRecords.length,
        }),
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
            targetId: "candidate:phase-three-integrated-live-passage",
            role: "server",
            surface: "api",
            reason:
              "phase three integrated live passage remains contained simulation proof",
            attributes: {
              secretToken: "phase-three-integrated-placement-secret",
              liveHandle() {},
            },
          },
        ],
      });

      const payloadJson = JSON.stringify(payload);
      const packetJson = JSON.stringify(packet);
      expect(exportedEndpoint).toBe("http://127.0.0.1:4318/v1/traces");
      expect(packet.telemetry.export?.status).toBe("accepted");
      expect(packet.placementCandidates[0]?.decision).toBe("candidate-only");
      expect(packet.telemetry.sources).toEqual(
        expect.arrayContaining([
          "phase-three.integrated.provider",
          "phase-three.integrated.listener",
          "phase-three.integrated.elysia-host",
          "phase-three.integrated.server.orpc",
          "phase-three.integrated.server.runtime",
          "phase-three.integrated.server.adapter",
          "phase-three.integrated.server.harness",
          "phase-three.integrated.async.runtime",
          "phase-three.integrated.async.inngest",
          "phase-three.integrated.async.harness",
          "phase-three.integrated.runtime.lifecycle",
          "phase-three.integrated.catalog",
        ]),
      );
      for (const expectedEvent of [
        "provider.acquire",
        "boot.finalize.finished",
        "elysia.listener.started",
        "elysia.listener.network.request.start",
        "elysia.listener.stopped",
        "elysia.host.delegate.finished",
        "orpc.fetch.received",
        "orpc.handler.finished",
        "inngest.serve.responded",
        "harness.stop",
        "harness.invoke.failed",
        "runtime.invoke.success",
        "runtime.dispose.finished",
      ]) {
        expect(payloadJson).toContain(expectedEvent);
      }

      for (const secret of [
        "phase-three-integrated-listener-header-secret",
        "phase-three-integrated-email-config-secret",
        "phase-three-integrated-provider-policy-secret",
        "phase-three-integrated-resource-metadata-secret",
        "phase-three-integrated-server-execution-secret",
        "phase-three-integrated-server-request-secret",
        "phase-three-integrated-async-execution-secret",
        "phase-three-integrated-async-event-secret",
        "phase-three-integrated-post-listener-secret",
        "phase-three-integrated-post-stop-server-secret",
        "phase-three-integrated-post-stop-async-secret",
        "phase-three-integrated-placement-secret",
      ]) {
        expect(JSON.stringify(serverBody)).not.toContain(secret);
        expect(JSON.stringify(asyncBody)).not.toContain(secret);
        expect(payloadJson).not.toContain(secret);
        expect(packetJson).not.toContain(secret);
      }
      expect(packetJson).not.toContain("resourceSpans");
      assertNoLiveHandles(payload);
      assertNoLiveHandles(packet);
    } finally {
      globalThis.fetch = originalFetch;
      if (listener && !listenerStopped) {
        await listener.stop(true).catch(() => undefined);
      }
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
