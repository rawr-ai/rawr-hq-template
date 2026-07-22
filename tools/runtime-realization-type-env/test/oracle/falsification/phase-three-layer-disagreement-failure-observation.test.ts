import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import type { ExecutionDescriptor, WorkflowDispatcher } from "@rawr/sdk/spine";
import {
  CreateWorkItemPlan,
  CreateWorkItemRef,
  CreateWorkItemRouteDescriptor,
  PortableArtifact,
  SyncWorkItemStepPlan,
  SyncWorkItemStepRef,
} from "../../../scenarios/work-items/app-and-plan-artifacts";
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
  createRuntimeObservationRecorder,
  exportRuntimeTelemetryOtlpTraces,
  mountOracleAsyncHarness,
  mountOracleServerHarness,
  mountRuntimeInngestAsyncBoundary,
  mountRuntimeOrpcServerBoundary,
  projectRuntimeEventsToTelemetryRecords,
  type RuntimeTelemetryEventLike,
  type RuntimeTelemetryRecord,
} from "../../../src/oracle";
import type { RuntimeInngestAsyncStepResponse } from "../../../src/oracle/adapters/inngest-async";
import type { RuntimeOrpcServerResponse } from "../../../src/oracle/adapters/orpc-server";

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
    throw new Error(`layer-disagreement proof leaked live handle: ${String(value)}`);
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

function createWorkflowDispatcher(): WorkflowDispatcher {
  return {
    kind: "workflow.dispatcher",
    async dispatch() {
      return { runId: "run-phase-three-layer-disagreement" };
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
          return { id: "actor-layer-disagreement" };
        },
      },
      clients: {},
      resources: createContainedRuntimeResourceAccess([
        {
          id: "server-layer-resource",
          value: { seen: true },
          metadata: {
            secretToken: "server-layer-resource-secret",
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
      traceId: request.requestId ?? "trace-layer-disagreement",
      secretToken: "server-layer-execution-secret",
    },
  };
}

function createAsyncInvocationContext(event: { readonly name: string; readonly data: unknown }) {
  return {
    event: {
      name: event.name,
      data: event.data,
    },
    clients: {},
    resources: createContainedRuntimeResourceAccess([
      {
        id: "async-layer-resource",
        value: { seen: true },
        metadata: {
          secretToken: "async-layer-resource-secret",
          liveHandle() {},
        },
      },
    ]),
    workflows: createWorkflowDispatcher(),
    telemetry: {
      event() {},
    },
    execution: {
      traceId: "trace-layer-disagreement",
      secretToken: "async-layer-execution-secret",
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

const FailingServerDescriptor = {
  kind: "execution.descriptor",
  ref: CreateWorkItemRef,
  run() {
    return Effect.fail(new Error("server-runtime-failure-secret"));
  },
} as const satisfies ExecutionDescriptor;

const FailingAsyncDescriptor = {
  kind: "execution.descriptor",
  ref: SyncWorkItemStepRef,
  run() {
    return Effect.fail(new Error("async-runtime-failure-secret"));
  },
} as const satisfies ExecutionDescriptor;

function createFailingRuntime() {
  const table = createExecutionDescriptorTable([
    {
      ref: CreateWorkItemRef,
      descriptor: FailingServerDescriptor,
    },
    {
      ref: SyncWorkItemStepRef,
      descriptor: FailingAsyncDescriptor,
    },
  ]);
  const registry = createExecutionRegistry({
    plans: [CreateWorkItemPlan, SyncWorkItemStepPlan],
    descriptorTable: table,
  });

  return createProcessExecutionRuntime({ registry });
}

describe("phase three layer disagreement failure observation", () => {
  test("preserves boundary runtime telemetry and control-plane disagreement without false-green collapse", async () => {
    const runId = "phase-three-layer-disagreement-run";
    const traceId = "00112233445566778899aabbccddeeff";
    const runtime = createFailingRuntime();
    const telemetryRecords: RuntimeTelemetryRecord[] = [];

    const serverPayload = createServerAdapterCallbackPayload({
      routeDescriptor: CreateWorkItemRouteDescriptor,
      ref: CreateWorkItemRef,
    });
    const serverHarness = mountOracleServerHarness({
      harnessId: "server:hq:layer-disagreement",
      runtime,
      payloads: [serverPayload],
    });
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:layer-disagreement",
      prefix: "/rpc",
      payload: serverPayload,
      harness: serverHarness,
      createInvocationContext: createServerInvocationContext,
    });

    const asyncPayload = createAsyncStepBridgePayload({ ref: SyncWorkItemStepRef });
    const asyncHarness = mountOracleAsyncHarness({
      harnessId: "async:hq:layer-disagreement",
      runtime,
      payloads: [asyncPayload],
    });
    const asyncBoundary = mountRuntimeInngestAsyncBoundary({
      boundaryId: "inngest:hq:layer-disagreement",
      clientId: "rawr-runtime-realization-lab",
      functionId: "work-items-layer-disagreement",
      eventName: "rawr/work-item.sync",
      payload: asyncPayload,
      harness: asyncHarness,
      createInvocationContext: createAsyncInvocationContext,
    });

    try {
      const serverResult = await serverBoundary.handle(
        createOrpcRpcRequest({
          executionId: CreateWorkItemRef.executionId,
          requestId: traceId,
          input: {
            title: "Phase Three failure disagreement",
            secretToken: "server-request-secret",
          },
        })
      );
      expect(serverResult.matched).toBe(true);
      expect(serverResult.response.status).toBe(200);
      const serverBody =
        (await serverResult.response.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;
      expect(serverBody.json.status).toBe("failure");
      expect(serverBody.json.runtimeEvents.map((event) => event.name)).toContain(
        "runtime.invoke.failure"
      );
      expect(serverBody.json.adapterEvents).toContainEqual(
        expect.objectContaining({
          name: "adapter.delegate.finish",
          status: "failure",
        })
      );
      expect(serverBody.json.harnessRecords).toContainEqual(
        expect.objectContaining({
          phase: "harness.invoke.finished",
          status: "failure",
        })
      );
      expect(serverBoundary.records()).toContainEqual(
        expect.objectContaining({
          phase: "orpc.handler.finished",
          status: "failure",
        })
      );
      expect(serverBoundary.records()).toContainEqual(
        expect.objectContaining({
          phase: "orpc.fetch.matched",
          httpStatus: 200,
        })
      );

      const asyncResponse = await asyncBoundary.handle(
        asyncBoundary.createRequest({
          runId,
          eventData: {
            itemId: "item-1",
            requestedBy: "actor-layer-disagreement",
            secretToken: "async-event-secret",
          },
        })
      );
      expect(asyncResponse.status).toBe(206);
      const asyncBody =
        (await asyncResponse.json()) as readonly InngestStepRunOp<RuntimeInngestAsyncStepResponse>[];
      const asyncStep = asyncBody[0];
      if (!asyncStep) throw new Error("missing Inngest async step response");
      expect(asyncStep.op).toBe("StepRun");
      expect(asyncStep.name).toBe(SyncWorkItemStepRef.stepId);
      expect(asyncStep.data.status).toBe("failure");
      expect(asyncStep.data.runtimeEvents.map((event) => event.name)).toContain(
        "runtime.invoke.failure"
      );
      expect(asyncStep.data.adapterEvents).toContainEqual(
        expect.objectContaining({
          name: "adapter.delegate.finish",
          status: "failure",
        })
      );
      expect(asyncStep.data.harnessRecords).toContainEqual(
        expect.objectContaining({
          phase: "harness.invoke.finished",
          status: "failure",
        })
      );
      expect(asyncBoundary.records()).toContainEqual(
        expect.objectContaining({
          phase: "inngest.serve.responded",
          httpStatus: 206,
          status: "failure",
          protocolOperations: ["StepRun"],
          protocolPayloadRuntimeStatus: "failure",
        })
      );

      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.layer.server.runtime",
        runId,
        events: serverBody.json.runtimeEvents,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.layer.server.adapter",
        runId,
        events: serverBody.json.adapterEvents.map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.layer.server.harness",
        runId,
        events: serverBody.json.harnessRecords.map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.layer.server.orpc",
        runId,
        events: serverBoundary.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.layer.async.runtime",
        runId,
        events: asyncStep.data.runtimeEvents,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.layer.async.adapter",
        runId,
        events: asyncStep.data.adapterEvents.map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.layer.async.harness",
        runId,
        events: asyncStep.data.harnessRecords.map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.layer.async.inngest",
        runId,
        events: asyncBoundary.records().map(recordEvent),
      });

      const telemetryByName = new Map(
        telemetryRecords.map((record) => [
          `${record.source}:${record.name}:${record.sequence}`,
          record,
        ])
      );
      expect(
        [...telemetryByName.values()].some(
          (record) =>
            record.name === "runtime.invoke.failure" &&
            record.attributes.executionId === CreateWorkItemRef.executionId
        )
      ).toBe(true);
      expect(
        [...telemetryByName.values()].some(
          (record) =>
            record.source === "phase-three.layer.server.adapter" &&
            record.name === "adapter.delegate.finish" &&
            record.attributes.status === "failure"
        )
      ).toBe(true);
      expect(
        [...telemetryByName.values()].some(
          (record) =>
            record.source === "phase-three.layer.server.harness" &&
            record.name === "harness.invoke.finished" &&
            record.attributes.status === "failure"
        )
      ).toBe(true);
      expect(
        [...telemetryByName.values()].some(
          (record) =>
            record.source === "phase-three.layer.server.orpc" &&
            record.name === "orpc.handler.finished" &&
            record.attributes.status === "failure"
        )
      ).toBe(true);
      expect(
        [...telemetryByName.values()].some(
          (record) => record.name === "orpc.fetch.matched" && record.attributes.httpStatus === 200
        )
      ).toBe(true);
      expect(
        [...telemetryByName.values()].some(
          (record) =>
            record.source === "phase-three.layer.async.adapter" &&
            record.name === "adapter.delegate.finish" &&
            record.attributes.status === "failure"
        )
      ).toBe(true);
      expect(
        [...telemetryByName.values()].some(
          (record) =>
            record.source === "phase-three.layer.async.harness" &&
            record.name === "harness.invoke.finished" &&
            record.attributes.status === "failure"
        )
      ).toBe(true);
      expect(
        [...telemetryByName.values()].some(
          (record) =>
            record.name === "inngest.serve.responded" &&
            record.attributes.httpStatus === 206 &&
            record.attributes.status === "failure" &&
            record.attributes.protocolPayloadRuntimeStatus === "failure"
        )
      ).toBe(true);

      const payload = buildRuntimeTelemetryOtlpTracePayload({
        serviceName: "runtime-realization-type-env",
        runId,
        traceId,
        records: telemetryRecords,
        resourceAttributes: {
          phase: "phase-three",
          secretToken: "telemetry-resource-secret",
        },
      });
      const payloadJson = JSON.stringify(payload);
      expect(payloadJson).toContain("orpc.fetch.matched");
      expect(payloadJson).toContain("inngest.serve.responded");
      expect(payloadJson).toContain("protocolPayloadRuntimeStatus");
      expect(payloadJson).toContain("runtime.invoke.failure");

      const exportResult = await exportRuntimeTelemetryOtlpTraces({
        endpoint: "http://127.0.0.1:4318",
        payload,
        fetch: async () => ({
          status: 500,
          statusText: "OTLP failed",
          async text() {
            return JSON.stringify({
              token: "failed-export-response-secret",
              resourceSpans: [{ name: "do-not-copy-submitted-payload" }],
            });
          },
        }),
      });
      expect(exportResult.status).toBe("failed");
      expect(serverBody.json.status).toBe("failure");
      expect(asyncStep.data.status).toBe("failure");

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
        catalog: createRuntimeObservationRecorder({}).catalog(),
        runId,
        traceId,
        telemetryRecords,
        telemetryExport: exportResult,
        correlationId: traceId,
        placementCandidates: [
          {
            targetId: "candidate:layer-disagreement",
            role: "async",
            surface: "workflow",
            reason: "layer-disagreement observation remains correlation-only",
            attributes: {
              secretToken: "placement-secret",
              otlpPayload: payload,
              liveHandle() {},
            },
          },
        ],
        attributes: {
          observationNote: "control plane packet is correlation-only",
          requestBody: {
            token: "packet-attribute-secret",
          },
        },
      });
      const packetJson = JSON.stringify(packet);
      expect(packet.telemetry.runId).toBe(runId);
      expect(packet.telemetry.traceId).toBe(traceId);
      expect(packet.telemetry.recordCount).toBe(telemetryRecords.length);
      expect(packet.telemetry.sources).toContain("phase-three.layer.server.orpc");
      expect(packet.telemetry.sources).toContain("phase-three.layer.async.inngest");
      expect(packet.telemetry.names).toContain("orpc.fetch.matched");
      expect(packet.telemetry.names).toContain("inngest.serve.responded");
      expect(packet.telemetry.export).toEqual({
        kind: "runtime.telemetry-otlp-export-result",
        status: "failed",
        endpoint: "http://127.0.0.1:4318/v1/traces",
        httpStatus: 500,
      });
      expect(packetJson).not.toContain("protocolPayloadRuntimeStatus");
      expect(packetJson).not.toContain("resourceSpans");
      expect(packetJson).not.toContain("failed-export-response-secret");

      for (const secret of [
        "server-runtime-failure-secret",
        "async-runtime-failure-secret",
        "server-request-secret",
        "async-event-secret",
        "server-layer-resource-secret",
        "async-layer-resource-secret",
        "server-layer-execution-secret",
        "async-layer-execution-secret",
        "telemetry-resource-secret",
        "placement-secret",
        "packet-attribute-secret",
      ]) {
        expect(JSON.stringify(serverBody)).not.toContain(secret);
        expect(JSON.stringify(asyncBody)).not.toContain(secret);
        expect(payloadJson).not.toContain(secret);
        expect(JSON.stringify(exportResult)).not.toContain(secret);
        expect(packetJson).not.toContain(secret);
      }
      assertNoLiveHandles(payload);
      assertNoLiveHandles(packet);
    } finally {
      await asyncHarness.stop();
      await serverHarness.stop();
      await runtime.dispose();
    }
  });
});
