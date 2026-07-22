import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import { defineRuntimeProfile, providerSelection } from "@rawr/sdk/runtime/profiles";
import { defineRuntimeProvider, providerFx } from "@rawr/sdk/runtime/providers";
import { defineRuntimeResource } from "@rawr/sdk/runtime/resources";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import type { WorkflowDispatcher } from "@rawr/sdk/spine";
import {
  CreateWorkItemDescriptor,
  CreateWorkItemPlan,
  CreateWorkItemRef,
  CreateWorkItemRouteDescriptor,
  PortableArtifact,
  SyncWorkItemStepDescriptor,
  SyncWorkItemStepPlan,
  SyncWorkItemStepRef,
} from "../../../scenarios/work-items/app-and-plan-artifacts";
import { WorkItemsServerApiServices } from "../../../scenarios/work-items/server-api-plugin";
import type { WorkItem } from "../../../scenarios/work-items/work-items-service";
import { createAsyncStepBridgePayload } from "../../../src/adapters/async";
import { createServerAdapterCallbackPayload } from "../../../src/adapters/server";
import {
  buildRuntimeTelemetryOtlpTracePayload,
  type CompiledProcessPlan,
  createContainedRuntimeResourceAccess,
  createDeploymentRuntimeHandoff,
  createExecutionDescriptorTable,
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
  projectRuntimeCatalogToTelemetryRecords,
  projectRuntimeEventsToTelemetryRecords,
  providerBootResourceModuleId,
  type RuntimeTelemetryEventLike,
  type RuntimeTelemetryRecord,
} from "../../../src/oracle";
import type { RuntimeInngestAsyncStepResponse } from "../../../src/oracle/adapters/inngest-async";
import type { RuntimeOrpcServerResponse } from "../../../src/oracle/adapters/orpc-server";
import { deriveProviderDependencyGraph } from "../../../src/spine/derive";

interface OrpcEncoded<T> {
  readonly json: T;
}

interface InngestStepRunOp<T> {
  readonly op: "StepRun";
  readonly name: string;
  readonly data: T;
}

function assertNoLiveHandles(value: unknown): void {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    throw new Error(`phase two observation leaked live handle: ${String(value)}`);
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
                id: "created-for-observation",
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

function createWorkflowDispatcher(): WorkflowDispatcher {
  return {
    kind: "workflow.dispatcher",
    async dispatch() {
      return { runId: "run-phase-two-observation" };
    },
  };
}

function createServerInvocationContext(request: {
  readonly input: unknown;
  readonly requestId?: string;
}) {
  return {
    input: request.input,
    context: {
      request: {
        async requireActor() {
          return { id: "actor-observation" };
        },
      },
      clients: createClients(),
      resources: createContainedRuntimeResourceAccess([
        {
          id: "observation-server-resource",
          value: {
            seen: true,
          },
          metadata: {
            secretToken: "server-resource-secret",
            liveHandle() {},
          },
        },
      ]),
      workflows: createWorkflowDispatcher(),
    },
    telemetry: {
      event() {},
    },
    execution: {
      traceId: request.requestId ?? "trace-phase-two-observation",
      secretToken: "server-execution-secret",
    },
  };
}

function createAsyncInvocationContext(event: { readonly name: string; readonly data: unknown }) {
  return {
    event: {
      name: event.name,
      data: event.data,
    },
    clients: {
      workItems: createClients().workItems.withInvocation({
        invocation: { traceId: "trace-phase-two-observation" },
      }),
    },
    resources: createContainedRuntimeResourceAccess([
      {
        id: "observation-async-resource",
        value: {
          seen: true,
        },
        metadata: {
          secretToken: "async-resource-secret",
          liveHandle() {},
        },
      },
    ]),
    workflows: createWorkflowDispatcher(),
    telemetry: {
      event() {},
    },
    execution: {
      traceId: "trace-phase-two-observation",
      secretToken: "async-execution-secret",
    },
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

describe("phase two telemetry HyperDX catalog observation", () => {
  test("projects provider server async and catalog records into redacted OTLP and control-plane evidence", async () => {
    const runId = "phase-two-observation-run";
    const traceId = "00112233445566778899aabbccddeeff";
    const runtime = createRuntime();
    const telemetryRecords: RuntimeTelemetryRecord[] = [];

    const ObservedResource = defineRuntimeResource<
      "phase-two.observed-secret",
      { readonly token: string; close(): void }
    >({
      id: "phase-two.observed-secret",
      title: "Phase Two observed secret",
    });
    const ObservedProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "phase-two.observed-provider",
      title: "Phase Two observed provider",
      provides: ObservedResource,
      requires: [],
      build(context) {
        context.telemetry.event("phase-two.provider.telemetry", {
          providerId: "phase-two.observed-provider",
          secretToken: "provider-telemetry-secret",
          liveHandle() {},
        });

        return providerFx.acquireRelease({
          acquire: function* () {
            return yield* Effect.succeed({
              token: "provider-value-secret",
              close() {},
            });
          },
          release: (value) => Effect.sync(() => value.close()),
        });
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "phase-two.observation-profile",
      providerSelections: [
        providerSelection({
          resource: ObservedResource,
          provider: ObservedProvider,
          lifetime: "process",
          role: "server",
        }),
      ],
    });
    const providerTrace = createProviderProvisioningTrace();
    const providerModules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: deriveProviderDependencyGraph(profile),
      processId: "phase-two-observation-process",
      trace: providerTrace,
      configs: {
        [ObservedProvider.id]: {
          apiKey: "provider-config-secret",
          liveHandle() {},
        },
      },
      boundaryPolicy({ phase, key }) {
        return createRuntimeBoundaryPolicy({
          policyId: `policy:${phase}:${key.providerId}`,
          boundary: phase === "acquire" ? "provider.acquire" : "provider.release",
          subjectId: providerBootResourceModuleId(key),
          metadata: {
            providerId: key.providerId,
            secretToken: "provider-policy-secret",
          },
        });
      },
    });
    const providerResult = await executeRuntimeBootgraph({
      modules: providerModules,
    });
    expect(providerResult.status).toBe("started");
    if (providerResult.status !== "started") throw providerResult.error;
    await providerResult.finalize();
    appendTelemetryRecords(telemetryRecords, {
      source: "phase-two.provider",
      runId,
      events: providerTrace.events,
    });

    const serverPayload = createServerAdapterCallbackPayload({
      routeDescriptor: CreateWorkItemRouteDescriptor,
      ref: CreateWorkItemRef,
    });
    const serverHarness = mountOracleServerHarness({
      harnessId: "server:hq:observation",
      runtime,
      payloads: [serverPayload],
    });
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:observation",
      prefix: "/rpc",
      payload: serverPayload,
      harness: serverHarness,
      createInvocationContext: createServerInvocationContext,
    });

    const serverResult = await serverBoundary.handle(
      createOrpcRpcRequest({
        executionId: CreateWorkItemRef.executionId,
        requestId: traceId,
        input: {
          title: "Phase Two observation",
          secretToken: "server-request-secret",
        },
      })
    );
    expect(serverResult.response.status).toBe(200);
    const serverBody =
      (await serverResult.response.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;
    appendTelemetryRecords(telemetryRecords, {
      source: "phase-two.server.runtime",
      runId,
      events: serverBody.json.runtimeEvents,
    });
    appendTelemetryRecords(telemetryRecords, {
      source: "phase-two.server.adapter",
      runId,
      events: serverBody.json.adapterEvents,
    });
    appendTelemetryRecords(telemetryRecords, {
      source: "phase-two.server.harness",
      runId,
      events: serverBody.json.harnessRecords.map(recordEvent),
    });
    appendTelemetryRecords(telemetryRecords, {
      source: "phase-two.server.orpc",
      runId,
      events: serverBoundary.records().map(recordEvent),
    });

    const asyncPayload = createAsyncStepBridgePayload({ ref: SyncWorkItemStepRef });
    const asyncHarness = mountOracleAsyncHarness({
      harnessId: "async:hq:observation",
      runtime,
      payloads: [asyncPayload],
    });
    const asyncBoundary = mountRuntimeInngestAsyncBoundary({
      boundaryId: "inngest:hq:observation",
      clientId: "rawr-runtime-realization-lab",
      functionId: "work-items-observation",
      eventName: "rawr/work-item.sync",
      payload: asyncPayload,
      harness: asyncHarness,
      createInvocationContext: createAsyncInvocationContext,
    });
    const asyncResponse = await asyncBoundary.handle(
      asyncBoundary.createRequest({
        runId,
        eventData: {
          itemId: "item-1",
          requestedBy: "actor-observation",
          secretToken: "async-event-secret",
        },
      })
    );
    expect(asyncResponse.status).toBe(206);
    const asyncBody =
      (await asyncResponse.json()) as readonly InngestStepRunOp<RuntimeInngestAsyncStepResponse>[];
    const asyncStep = asyncBody[0];
    expect(asyncStep?.name).toBe(SyncWorkItemStepRef.stepId);
    if (!asyncStep) throw new Error("missing Inngest async step response");
    appendTelemetryRecords(telemetryRecords, {
      source: "phase-two.async.runtime",
      runId,
      events: asyncStep.data.runtimeEvents,
    });
    appendTelemetryRecords(telemetryRecords, {
      source: "phase-two.async.adapter",
      runId,
      events: asyncStep.data.adapterEvents,
    });
    appendTelemetryRecords(telemetryRecords, {
      source: "phase-two.async.harness",
      runId,
      events: asyncStep.data.harnessRecords.map(recordEvent),
    });
    appendTelemetryRecords(telemetryRecords, {
      source: "phase-two.async.inngest",
      runId,
      events: asyncBoundary.records().map(recordEvent),
    });

    telemetryRecords.push(
      ...projectRuntimeCatalogToTelemetryRecords({
        source: "phase-two.catalog",
        runId,
        catalog: providerResult.catalog(),
        startingSequence: telemetryRecords.length,
      })
    );

    const payload = buildRuntimeTelemetryOtlpTracePayload({
      serviceName: "runtime-realization-type-env",
      runId,
      traceId,
      records: telemetryRecords,
      resourceAttributes: {
        phase: "phase-two",
        secretToken: "resource-attribute-secret",
      },
    });
    let captured:
      | {
          readonly url: string;
          readonly body: string;
        }
      | undefined;
    const exportResult = await exportRuntimeTelemetryOtlpTraces({
      endpoint: "http://127.0.0.1:4318",
      payload,
      fetch: async (url, init) => {
        captured = {
          url,
          body: init.body,
        };
        return {
          status: 200,
          statusText: "OK",
          async text() {
            return '{"partialSuccess":{}}';
          },
        };
      },
    });

    const compiledProcessPlan: CompiledProcessPlan = {
      kind: "compiled.process-plan",
      appId: "hq",
      executionPlans: [CreateWorkItemPlan, SyncWorkItemStepPlan],
    };
    const packet = createMigrationControlPlaneObservationPacket({
      deploymentHandoff: createDeploymentRuntimeHandoff({
        portableArtifact: PortableArtifact,
        compiledProcessPlan,
      }),
      catalog: providerResult.catalog(),
      runId,
      traceId,
      telemetryRecords,
      telemetryExport: exportResult,
      correlationId: traceId,
      placementCandidates: [
        {
          targetId: "candidate:phase-two-observation",
          role: "server",
          surface: "api",
          reason: "integrated provider/server/async observation remains candidate-only",
          attributes: {
            candidateSecret: "candidate-secret",
            otlpPayload: payload,
            liveHandle() {},
          },
        },
      ],
      attributes: {
        observationNote: "phase two contained observation only",
        requestBody: {
          token: "packet-attribute-secret",
        },
      },
    });

    const payloadJson = JSON.stringify(payload);
    const packetJson = JSON.stringify(packet);
    expect(exportResult.status).toBe("accepted");
    expect(captured?.url).toBe("http://127.0.0.1:4318/v1/traces");
    expect(telemetryRecords.map((record) => record.source)).toContain("phase-two.async.inngest");
    expect(payloadJson).toContain("provider.acquire");
    expect(payloadJson).toContain("provider.release");
    expect(payloadJson).toContain("plugin.server-api");
    expect(payloadJson).toContain("plugin.async-step");
    expect(payloadJson).toContain("orpc.handler.finished");
    expect(payloadJson).toContain("inngest.step.run");
    expect(payloadJson).toContain("boot.finalize.finished");
    expect(packet.telemetry.recordCount).toBe(telemetryRecords.length);
    expect(packet.telemetry.sources).toContain("phase-two.provider");
    expect(packet.telemetry.sources).toContain("phase-two.server.orpc");
    expect(packet.telemetry.sources).toContain("phase-two.async.inngest");
    expect(packet.telemetry.sources).toContain("phase-two.catalog");
    expect(packet.telemetry.export?.status).toBe("accepted");
    expect(packet.placementCandidates[0]?.decision).toBe("candidate-only");

    for (const secret of [
      "provider-telemetry-secret",
      "provider-value-secret",
      "provider-config-secret",
      "provider-policy-secret",
      "server-request-secret",
      "server-resource-secret",
      "server-execution-secret",
      "async-event-secret",
      "async-resource-secret",
      "async-execution-secret",
      "resource-attribute-secret",
      "candidate-secret",
      "packet-attribute-secret",
    ]) {
      expect(payloadJson).not.toContain(secret);
      expect(captured?.body ?? "").not.toContain(secret);
      expect(packetJson).not.toContain(secret);
    }
    expect(packetJson).not.toContain("resourceSpans");
    expect(packetJson).not.toContain("partialSuccess");
    assertNoLiveHandles(payload);
    assertNoLiveHandles(packet);

    await asyncHarness.stop();
    await serverHarness.stop();
    await runtime.dispose();
  });
});
