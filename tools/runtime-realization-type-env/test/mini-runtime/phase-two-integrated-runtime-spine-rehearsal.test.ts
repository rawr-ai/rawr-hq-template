import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import type { WorkflowDispatcher } from "@rawr/sdk/spine";
import { defineRuntimeProfile, providerSelection } from "@rawr/sdk/runtime/profiles";
import { defineRuntimeProvider, providerFx } from "@rawr/sdk/runtime/providers";
import { defineRuntimeResource } from "@rawr/sdk/runtime/resources";
import { defineRuntimeSchema } from "@rawr/sdk/runtime/schema";
import {
  buildRuntimeTelemetryOtlpTracePayload,
  createDeploymentRuntimeHandoff,
  createExecutionRegistry,
  createMigrationControlPlaneObservationPacket,
  createMiniRuntimeResourceAccess,
  createProcessExecutionRuntime,
  createProviderProvisioningModules,
  createProviderProvisioningTrace,
  createRuntimeBoundaryPolicy,
  createRuntimeObservationRecorder,
  executeMiniBootgraph,
  exportRuntimeTelemetryOtlpTraces,
  mountMiniAsyncHarness,
  mountMiniServerHarness,
  mountRuntimeInngestAsyncBoundary,
  mountRuntimeOrpcServerBoundary,
  projectRuntimeCatalogToTelemetryRecords,
  projectRuntimeEventsToTelemetryRecords,
  providerBootResourceModuleId,
  type MiniRuntimeResourceDefinition,
  type ProviderProvisionedValue,
  type RuntimeInngestAsyncStepResponse,
  type RuntimeOrpcServerResponse,
  type RuntimeTelemetryEventLike,
  type RuntimeTelemetryRecord,
} from "../../src/mini-runtime";
import {
  compileRuntimeSpine,
  deriveProviderDependencyGraph,
  deriveRuntimeSpine,
} from "../../src/spine/simulate";
import type {
  AsyncStepBridgePayload,
  RuntimeSpineCompilation,
  ServerAdapterCallbackPayload,
} from "../../src/spine/artifacts";
import {
  CreateWorkItemDescriptor,
  PortableArtifact,
  SyncWorkItemStepDescriptor,
} from "../../fixtures/positive/app-and-plan-artifacts";
import {
  EmailProvider,
  RuntimeFixtureProfile,
} from "../../fixtures/positive/resource-provider-profile";
import { WorkItemsServerApiPlugin } from "../../fixtures/positive/server-api-plugin";
import type { WorkItem } from "../../fixtures/positive/work-items-service";

interface OrpcEncoded<T> {
  readonly json: T;
}

interface InngestStepRunOp<T> {
  readonly op: "StepRun";
  readonly name: string;
  readonly data: T;
}

function assertNoLiveHandles(value: unknown): void {
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new Error(`integrated rehearsal leaked live handle: ${String(value)}`);
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
  if (!payload) throw new Error("missing integrated server payload");
  return payload;
}

function asyncPayloadFrom(
  compilation: RuntimeSpineCompilation,
): AsyncStepBridgePayload {
  const payload = compilation.adapterLoweringPlan.payloads.find(
    (entry): entry is AsyncStepBridgePayload =>
      entry.kind === "adapter.async-step-bridge-payload",
  );
  if (!payload) throw new Error("missing integrated async payload");
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
                title: "Integrated fixture item",
                status: "open",
              } satisfies WorkItem);
            },
            create(request) {
              return Effect.succeed({
                id: "created-via-integrated-rehearsal",
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
): readonly MiniRuntimeResourceDefinition[] {
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
          secretToken: "integrated-resource-metadata-secret",
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
      return { runId: "run-integrated-rehearsal" };
    },
  };
}

function createServerInvocationContext(
  resources: readonly MiniRuntimeResourceDefinition[],
) {
  return (request: { readonly input: unknown; readonly requestId?: string }) => ({
    input: request.input,
    context: {
      request: {
        async requireActor() {
          return { id: "actor-integrated" };
        },
      },
      clients: createClients(),
      resources: createMiniRuntimeResourceAccess(resources),
      workflows: workflowDispatcher(),
    },
    telemetry: {
      event() {},
    },
    execution: {
      traceId: request.requestId ?? "trace-integrated-rehearsal",
      secretToken: "integrated-server-execution-secret",
    },
  });
}

function createAsyncInvocationContext(
  resources: readonly MiniRuntimeResourceDefinition[],
) {
  return (event: { readonly name: string; readonly data: unknown }) => ({
    event: {
      name: event.name,
      data: event.data,
    },
    clients: {
      workItems: createClients().workItems.withInvocation({
        invocation: { traceId: "trace-integrated-rehearsal" },
      }),
    },
    resources: createMiniRuntimeResourceAccess(resources),
    workflows: workflowDispatcher(),
    telemetry: {
      event() {},
    },
    execution: {
      traceId: "trace-integrated-rehearsal",
      secretToken: "integrated-async-execution-secret",
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
  },
) {
  records.push(
    ...projectRuntimeEventsToTelemetryRecords({
      ...input,
      startingSequence: records.length,
    }),
  );
}

describe("phase two integrated runtime-spine rehearsal", () => {
  test("composes derivation compilation provisioning mounting execution and observation", async () => {
    const runId = "phase-two-integrated-rehearsal";
    const traceId = "11112222333344445555666677778888";
    const compilation = deriveAndCompileSpine();
    const serverPayload = serverPayloadFrom(compilation);
    const asyncPayload = asyncPayloadFrom(compilation);
    const providerTrace = createProviderProvisioningTrace();

    expect(compilation.appId).toBe("hq");
    expect(compilation.portableArtifact.executionDescriptorRefs).toHaveLength(2);
    expect(collectFunctionPaths(compilation.portableArtifact)).toEqual([]);
    expect(compilation.adapterLoweringPlan.diagnostics).toEqual([]);
    expect(compilation.adapterLoweringPlan.payloads.map((payload) => payload.kind)).toEqual([
      "adapter.server-callback-payload",
      "adapter.async-step-bridge-payload",
    ]);
    expect(compilation.harnessPlans.map((plan) => plan.harness)).toEqual([
      "server",
      "async",
    ]);
    expect(compilation.bootgraphInput.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.provider-effect-plan.lowering-reserved",
    );

    if (!compilation.providerDependencyGraph) {
      throw new Error("integrated rehearsal expected provider dependency graph");
    }

    const providerModules = createProviderProvisioningModules({
      profileId: RuntimeFixtureProfile.id,
      providerSelections: RuntimeFixtureProfile.providerSelections,
      providerDependencyGraph: compilation.providerDependencyGraph,
      processId: "phase-two-integrated-process",
      trace: providerTrace,
      configs: {
        [EmailProvider.id]: {
          from: "integrated@example.com",
          token: "integrated-email-config-secret",
          liveHandle() {},
        },
      },
      boundaryPolicy({ phase, key }) {
        return createRuntimeBoundaryPolicy({
          policyId: `integrated:${phase}:${key.providerId}`,
          boundary: phase === "acquire" ? "provider.acquire" : "provider.release",
          subjectId: providerBootResourceModuleId(key),
          metadata: {
            providerId: key.providerId,
            secretToken: "integrated-provider-policy-secret",
          },
        });
      },
    });
    const providerResult = await executeMiniBootgraph({ modules: providerModules });
    expect(providerResult.status).toBe("started");
    if (providerResult.status !== "started") throw providerResult.error;

    const registry = createExecutionRegistry({
      plans: compilation.registryInput.executionPlans,
      descriptorTable: compilation.registryInput.descriptorTable,
    });
    const runtime = createProcessExecutionRuntime({ registry });
    const resources = providerResourcesFromStartedValues(
      providerResult.startedValues(),
    );
    const serverHarness = mountMiniServerHarness({
      harnessId: "server:hq:integrated",
      runtime,
      payloads: [serverPayload],
    });
    const asyncHarness = mountMiniAsyncHarness({
      harnessId: "async:hq:integrated",
      runtime,
      payloads: [asyncPayload],
    });
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:integrated",
      prefix: "/rpc",
      payload: serverPayload,
      harness: serverHarness,
      createInvocationContext: createServerInvocationContext(resources),
    });
    const asyncBoundary = mountRuntimeInngestAsyncBoundary({
      boundaryId: "inngest:hq:integrated",
      clientId: "rawr-runtime-realization-lab",
      functionId: "work-items-integrated",
      eventName: "rawr/work-item.sync",
      payload: asyncPayload,
      harness: asyncHarness,
      createInvocationContext: createAsyncInvocationContext(resources),
    });

    try {
      const serverResult = await serverBoundary.handle(
        createOrpcRpcRequest({
          executionId: serverPayload.ref.executionId,
          requestId: traceId,
          input: {
            title: "Integrated rehearsal",
            secretToken: "integrated-server-request-secret",
          },
        }),
      );
      expect(serverResult.response.status).toBe(200);
      const serverBody =
        (await serverResult.response.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;

      const asyncResponse = await asyncBoundary.handle(
        asyncBoundary.createRequest({
          runId,
          eventData: {
            itemId: "item-1",
            requestedBy: "actor-integrated",
            secretToken: "integrated-async-event-secret",
          },
        }),
      );
      expect(asyncResponse.status).toBe(206);
      const asyncBody =
        (await asyncResponse.json()) as readonly InngestStepRunOp<RuntimeInngestAsyncStepResponse>[];
      const asyncStep = asyncBody[0];
      if (!asyncStep) throw new Error("missing integrated async step");

      await providerResult.finalize();

      const telemetryRecords: RuntimeTelemetryRecord[] = [];
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-two.integrated.provider",
        runId,
        events: providerTrace.events,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-two.integrated.server.runtime",
        runId,
        events: serverBody.json.runtimeEvents,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-two.integrated.server.orpc",
        runId,
        events: serverBoundary.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-two.integrated.async.runtime",
        runId,
        events: asyncStep.data.runtimeEvents,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-two.integrated.async.inngest",
        runId,
        events: asyncBoundary.records().map(recordEvent),
      });
      telemetryRecords.push(
        ...projectRuntimeCatalogToTelemetryRecords({
          source: "phase-two.integrated.catalog",
          runId,
          catalog: providerResult.catalog(),
          startingSequence: telemetryRecords.length,
        }),
      );

      const payload = buildRuntimeTelemetryOtlpTracePayload({
        serviceName: "runtime-realization-type-env",
        runId,
        traceId,
        records: telemetryRecords,
      });
      const exportResult = await exportRuntimeTelemetryOtlpTraces({
        endpoint: "http://127.0.0.1:4318",
        payload,
        fetch: async () => ({
          status: 200,
          statusText: "OK",
          async text() {
            return "{}";
          },
        }),
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
            targetId: "candidate:integrated-rehearsal",
            role: "server",
            surface: "api",
            reason: "integrated rehearsal remains candidate-only",
            attributes: {
              secretToken: "integrated-placement-secret",
              liveHandle() {},
            },
          },
        ],
      });

      const payloadJson = JSON.stringify(payload);
      const packetJson = JSON.stringify(packet);
      expect(serverBody.json.output).toEqual({
        id: "created-via-integrated-rehearsal",
        title: "Integrated rehearsal",
        status: "open",
      });
      expect(asyncStep.data.output).toEqual({ synced: true });
      expect(payloadJson).toContain("provider.acquire");
      expect(payloadJson).toContain("boot.finalize.finished");
      expect(payloadJson).toContain("plugin.server-api");
      expect(payloadJson).toContain("plugin.async-step");
      expect(payloadJson).toContain("orpc.handler.finished");
      expect(payloadJson).toContain("inngest.step.run");
      expect(packet.telemetry.sources).toContain("phase-two.integrated.provider");
      expect(packet.telemetry.sources).toContain("phase-two.integrated.server.orpc");
      expect(packet.telemetry.sources).toContain("phase-two.integrated.async.inngest");
      expect(packet.telemetry.sources).toContain("phase-two.integrated.catalog");
      expect(packet.telemetry.export?.status).toBe("accepted");
      expect(packet.placementCandidates[0]?.decision).toBe("candidate-only");

      for (const secret of [
        "integrated-email-config-secret",
        "integrated-provider-policy-secret",
        "integrated-resource-metadata-secret",
        "integrated-server-execution-secret",
        "integrated-server-request-secret",
        "integrated-async-execution-secret",
        "integrated-async-event-secret",
        "integrated-placement-secret",
      ]) {
        expect(payloadJson).not.toContain(secret);
        expect(packetJson).not.toContain(secret);
      }
      expect(packetJson).not.toContain("resourceSpans");
      assertNoLiveHandles(payload);
      assertNoLiveHandles(packet);
    } finally {
      await asyncHarness.stop();
      await serverHarness.stop();
      await runtime.dispose();
      await providerResult.finalize();
    }
  });

  test("keeps child proof falsifiers visible during integrated rehearsal", async () => {
    const ConfigResource = defineRuntimeResource<
      "integrated.config-resource",
      { readonly ok: true }
    >({
      id: "integrated.config-resource",
      title: "Integrated config resource",
    });
    const ConfigSchema = defineRuntimeSchema<
      "integrated.config",
      { readonly token: string }
    >({
      id: "integrated.config",
      parse(value) {
        const record = value as { readonly token?: unknown } | undefined;
        if (!record || record.token !== "valid-token") {
          throw new Error("integrated config rejected");
        }
        return { token: record.token };
      },
    });
    const buildEvents: string[] = [];
    const Provider = defineRuntimeProvider<
      typeof ConfigResource,
      { readonly token: string }
    >({
      kind: "runtime.provider",
      id: "integrated.config-provider",
      title: "Integrated config provider",
      provides: ConfigResource,
      requires: [],
      configSchema: ConfigSchema,
      build() {
        buildEvents.push("provider-build");
        return providerFx.acquireRelease({
          acquire: function* () {
            return yield* Effect.succeed({ ok: true as const });
          },
        });
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "integrated.invalid-config-profile",
      providerSelections: [
        providerSelection({
          resource: ConfigResource,
          provider: Provider,
          lifetime: "process",
          role: "server",
        }),
      ],
    });
    const trace = createProviderProvisioningTrace();
    const providerFailure = await executeMiniBootgraph({
      modules: createProviderProvisioningModules({
        profileId: profile.id,
        providerSelections: profile.providerSelections,
        providerDependencyGraph: deriveProviderDependencyGraph(profile),
        processId: "integrated-falsifier",
        trace,
        configs: {
          [Provider.id]: {
            token: "invalid-provider-secret",
            liveHandle() {},
          },
        },
      }),
    });
    expect(providerFailure.status).toBe("failed");
    expect(buildEvents).toEqual([]);
    expect(JSON.stringify(providerFailure.catalog)).not.toContain(
      "invalid-provider-secret",
    );
    expect(JSON.stringify(trace.events)).not.toContain("invalid-provider-secret");

    const compilation = deriveAndCompileSpine();
    const serverPayload = serverPayloadFrom(compilation);
    const asyncPayload = asyncPayloadFrom(compilation);
    let serverInvocationCount = 0;
    const fakeServerHarness = {
      kind: "runtime.started-harness",
      harness: "server",
      harnessId: "server:integrated-fake",
      payloadExecutionIds: [serverPayload.ref.executionId],
      diagnostics: [],
      records() {
        return [];
      },
      async stop() {
        return [];
      },
      async handleRoute() {
        serverInvocationCount += 1;
        throw new Error("server harness should not run");
      },
    } as const satisfies ReturnType<typeof mountMiniServerHarness>;
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:integrated-falsifier",
      prefix: "/rpc",
      payload: serverPayload,
      harness: fakeServerHarness,
      createInvocationContext: createServerInvocationContext([]),
    });
    const unmatched = await serverBoundary.handle(
      new Request("http://runtime.test/not-rpc/invoke", {
        method: "POST",
        body: JSON.stringify({
          json: {
            executionId: serverPayload.ref.executionId,
            input: {
              title: "unmatched",
            },
          },
        }),
      }),
    );
    expect(unmatched.matched).toBe(false);
    expect(unmatched.response.status).toBe(404);
    expect(serverInvocationCount).toBe(0);

    let asyncInvocationCount = 0;
    const fakeAsyncHarness = {
      kind: "runtime.started-harness",
      harness: "async",
      harnessId: "async:integrated-fake",
      payloadExecutionIds: [asyncPayload.ref.executionId],
      diagnostics: [],
      records() {
        return [];
      },
      async stop() {
        return [];
      },
      async runStep() {
        asyncInvocationCount += 1;
        throw new Error("async harness should not run");
      },
    } as const satisfies ReturnType<typeof mountMiniAsyncHarness>;
    const asyncBoundary = mountRuntimeInngestAsyncBoundary({
      boundaryId: "inngest:hq:integrated-falsifier",
      clientId: "rawr-runtime-realization-lab",
      functionId: "work-items-integrated",
      eventName: "rawr/work-item.sync",
      payload: asyncPayload,
      harness: fakeAsyncHarness,
      createInvocationContext: createAsyncInvocationContext([]),
    });
    const requestUrl = new URL("http://runtime.test/api/inngest");
    requestUrl.searchParams.set("fnId", "missing-function");
    const missingFunction = await asyncBoundary.handle(
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
    expect(missingFunction.status).toBe(500);
    expect(asyncInvocationCount).toBe(0);

    expect(() =>
      createMigrationControlPlaneObservationPacket({
        deploymentHandoff: createDeploymentRuntimeHandoff({
          portableArtifact: PortableArtifact,
          compiledProcessPlan: compilation.compiledProcessPlan,
        }),
        catalog: createRuntimeObservationRecorder({}).catalog(),
        runId: "expected-run",
        telemetryRecords: [
          {
            kind: "runtime.telemetry-record",
            sequence: 1,
            source: "integrated.falsifier",
            name: "telemetry.run-mismatch",
            attributes: {
              telemetryRunId: "other-run",
            },
          },
        ],
      }),
    ).toThrow("telemetry runId mismatch");
  });
});
