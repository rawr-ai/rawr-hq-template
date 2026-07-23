import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import type { ExecutionDescriptor, WorkflowDispatcher } from "@rawr/sdk/spine";
import {
  CreateWorkItemDescriptor,
  CreateWorkItemPlan,
  CreateWorkItemRef,
  CreateWorkItemRouteDescriptor,
  PortableArtifact,
  SyncWorkItemStepPlan,
} from "../../../scenarios/work-items/app-and-plan-artifacts";
import { WorkItemsServerApiServices } from "../../../scenarios/work-items/server-api-plugin";
import type { WorkItem } from "../../../scenarios/work-items/work-items-service";
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
  mountOracleServerHarness,
  mountRuntimeElysiaHostBoundary,
  mountRuntimeOrpcServerBoundary,
  projectRuntimeEventsToTelemetryRecords,
  type RuntimeTelemetryEventLike,
  type RuntimeTelemetryRecord,
} from "../../../src/oracle";
import type { RuntimeOrpcServerResponse } from "../../../src/oracle/adapters/orpc-server";

interface OrpcEncoded<T> {
  readonly json: T;
}

function assertNoLiveHandles(value: unknown): void {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    throw new Error(`contained Elysia proof leaked live handle: ${String(value)}`);
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
                id: "created-via-elysia",
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

function createWorkflowDispatcher(): WorkflowDispatcher {
  return {
    kind: "workflow.dispatcher",
    async dispatch() {
      return { runId: "run-elysia-host" };
    },
  };
}

function createInvocationContext(request: {
  readonly input: unknown;
  readonly requestId?: string;
}) {
  return {
    input: request.input,
    context: {
      request: {
        async requireActor() {
          return { id: "actor-elysia" };
        },
      },
      clients: createClients(),
      resources: createContainedRuntimeResourceAccess([
        {
          id: "elysia-host-resource",
          value: { seen: true },
          metadata: {
            secretToken: "elysia-resource-secret",
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
      traceId: request.requestId ?? "trace-elysia-host",
      secretToken: "elysia-execution-secret",
    },
  };
}

function createRuntime(descriptor: ExecutionDescriptor = CreateWorkItemDescriptor) {
  const table = createExecutionDescriptorTable([
    {
      ref: CreateWorkItemRef,
      descriptor,
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
      "x-host-secret-token": "host-header-secret",
    },
    body: JSON.stringify({ json: input }),
  });
}

const FailingServerDescriptor = {
  kind: "execution.descriptor",
  ref: CreateWorkItemRef,
  run() {
    return Effect.fail(new Error("elysia-runtime-failure-secret"));
  },
} as const satisfies ExecutionDescriptor;

describe("phase three contained Elysia host passage", () => {
  test("forwards a real Elysia request through oRPC and the process runtime", async () => {
    const runId = "phase-three-elysia-host-run";
    const traceId = "11223344556677889900aabbccddeeff";
    const runtime = createRuntime();
    const telemetryRecords: RuntimeTelemetryRecord[] = [];
    const payload = createServerAdapterCallbackPayload({
      routeDescriptor: CreateWorkItemRouteDescriptor,
      ref: CreateWorkItemRef,
    });
    const harness = mountOracleServerHarness({
      harnessId: "server:hq:elysia-host",
      runtime,
      payloads: [payload],
    });
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:elysia-host",
      prefix: "/rpc",
      payload,
      harness,
      createInvocationContext,
    });
    const host = mountRuntimeElysiaHostBoundary({
      hostId: "elysia:hq:api",
      prefix: "/rpc",
      serverBoundary,
    });

    try {
      const response = await host.handle(
        createOrpcRpcRequest({
          executionId: CreateWorkItemRef.executionId,
          requestId: traceId,
          input: {
            title: "Elysia host passage",
            secretToken: "elysia-request-secret",
          },
        })
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;

      expect(body.json.status).toBe("success");
      expect(body.json.output).toEqual({
        id: "created-via-elysia",
        title: "Elysia host passage",
        status: "open",
      });
      expect(host.records().map((record) => record.phase)).toEqual([
        "elysia.host.received",
        "elysia.host.delegate.start",
        "elysia.host.delegate.finished",
        "elysia.host.responded",
      ]);
      expect(host.records()).toContainEqual(
        expect.objectContaining({
          phase: "elysia.host.delegate.finished",
          downstreamBoundaryId: "orpc:hq:elysia-host",
          downstreamMatched: true,
          status: "success",
          httpStatus: 200,
        })
      );
      expect(serverBoundary.records().map((record) => record.phase)).toEqual([
        "orpc.fetch.received",
        "orpc.handler.enter",
        "orpc.handler.finished",
        "orpc.fetch.matched",
      ]);
      expect(body.json.harnessRecords).toContainEqual(
        expect.objectContaining({
          phase: "harness.invoke.finished",
          status: "success",
        })
      );

      const appHandledResponse = await host.app.handle(
        createOrpcRpcRequest({
          executionId: CreateWorkItemRef.executionId,
          requestId: "trace-elysia-app-direct",
          input: {
            title: "Elysia app direct passage",
          },
        })
      );
      expect(appHandledResponse.status).toBe(200);
      const appHandledBody =
        (await appHandledResponse.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;
      expect(appHandledBody.json.status).toBe("success");
      expect(appHandledBody.json.output).toEqual({
        id: "created-via-elysia",
        title: "Elysia app direct passage",
        status: "open",
      });
      expect(
        host.records().filter((record) => record.phase === "elysia.host.received").length
      ).toBe(2);
      expect(
        serverBoundary.records().filter((record) => record.phase === "orpc.fetch.matched").length
      ).toBe(2);

      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.elysia.host",
        runId,
        events: host.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.elysia.orpc",
        runId,
        events: serverBoundary.records().map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.elysia.runtime",
        runId,
        events: body.json.runtimeEvents,
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.elysia.adapter",
        runId,
        events: body.json.adapterEvents.map(recordEvent),
      });
      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.elysia.harness",
        runId,
        events: body.json.harnessRecords.map(recordEvent),
      });

      expect(
        telemetryRecords.some(
          (record) =>
            record.source === "phase-three.elysia.host" &&
            record.name === "elysia.host.delegate.finished" &&
            record.attributes.downstreamBoundaryId === "orpc:hq:elysia-host"
        )
      ).toBe(true);
      expect(
        telemetryRecords.some(
          (record) =>
            record.source === "phase-three.elysia.orpc" && record.name === "orpc.fetch.matched"
        )
      ).toBe(true);
      expect(
        telemetryRecords.some(
          (record) =>
            record.source === "phase-three.elysia.runtime" &&
            record.name === "runtime.invoke.success"
        )
      ).toBe(true);

      const otlpPayload = buildRuntimeTelemetryOtlpTracePayload({
        serviceName: "runtime-realization-type-env",
        runId,
        traceId,
        records: telemetryRecords,
        resourceAttributes: {
          phase: "phase-three",
          secretToken: "elysia-telemetry-secret",
        },
      });
      const otlpJson = JSON.stringify(otlpPayload);
      expect(otlpJson).toContain("elysia.host.delegate.finished");
      expect(otlpJson).toContain("orpc.fetch.matched");
      expect(otlpJson).toContain("runtime.invoke.success");

      const exportResult = await exportRuntimeTelemetryOtlpTraces({
        endpoint: "http://127.0.0.1:4318",
        payload: otlpPayload,
        fetch: async () => ({
          status: 202,
          async text() {
            return "";
          },
        }),
      });
      expect(exportResult.status).toBe("accepted");

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
            targetId: "candidate:elysia-host",
            role: "server",
            surface: "api",
            reason: "contained Elysia host passage remains lab correlation",
            attributes: {
              requestBody: {
                secretToken: "control-plane-request-secret",
              },
              liveHandle() {},
            },
          },
        ],
        attributes: {
          observationNote: "Elysia host passage is simulation proof only",
          otlpPayload,
        },
      });
      expect(packet.telemetry.sources).toContain("phase-three.elysia.host");
      expect(packet.telemetry.sources).toContain("phase-three.elysia.orpc");
      expect(packet.telemetry.sources).toContain("phase-three.elysia.runtime");
      expect(packet.telemetry.names).toContain("elysia.host.responded");
      expect(packet.telemetry.export).toEqual({
        kind: "runtime.telemetry-otlp-export-result",
        status: "accepted",
        endpoint: "http://127.0.0.1:4318/v1/traces",
        httpStatus: 202,
      });

      for (const secret of [
        "host-header-secret",
        "elysia-request-secret",
        "elysia-resource-secret",
        "elysia-execution-secret",
        "elysia-telemetry-secret",
        "control-plane-request-secret",
      ]) {
        expect(JSON.stringify(body)).not.toContain(secret);
        expect(JSON.stringify(telemetryRecords)).not.toContain(secret);
        expect(otlpJson).not.toContain(secret);
        expect(JSON.stringify(exportResult)).not.toContain(secret);
        expect(JSON.stringify(packet)).not.toContain(secret);
      }
      assertNoLiveHandles(otlpPayload);
      assertNoLiveHandles(packet);
    } finally {
      await harness.stop();
      await runtime.dispose();
    }
  });

  test("rejects unmatched Elysia routes before oRPC or runtime delegation", async () => {
    const runtime = createRuntime();
    const payload = createServerAdapterCallbackPayload({
      routeDescriptor: CreateWorkItemRouteDescriptor,
      ref: CreateWorkItemRef,
    });
    const harness = mountOracleServerHarness({
      harnessId: "server:hq:elysia-unmatched",
      runtime,
      payloads: [payload],
    });
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:elysia-unmatched",
      prefix: "/rpc",
      payload,
      harness,
      createInvocationContext,
    });
    const host = mountRuntimeElysiaHostBoundary({
      hostId: "elysia:hq:unmatched",
      prefix: "/rpc",
      serverBoundary,
    });

    try {
      const response = await host.handle(
        new Request("http://runtime.test/not-rpc/invoke", {
          method: "POST",
          body: JSON.stringify({
            json: {
              executionId: CreateWorkItemRef.executionId,
              input: { title: "should not delegate" },
            },
          }),
        })
      );

      expect(response.status).toBe(404);
      expect(host.records().map((record) => record.phase)).toEqual([
        "elysia.host.received",
        "elysia.host.responded",
      ]);
      expect(host.records()).toContainEqual(
        expect.objectContaining({
          phase: "elysia.host.responded",
          delegated: false,
          status: "unmatched",
          httpStatus: 404,
        })
      );
      expect(serverBoundary.records()).toEqual([]);
      expect(harness.records().map((record) => record.phase)).toEqual(["harness.start"]);
    } finally {
      await harness.stop();
      await runtime.dispose();
    }
  });

  test("keeps RAWR runtime failure distinct from Elysia host delegation success", async () => {
    const runtime = createRuntime(FailingServerDescriptor);
    const payload = createServerAdapterCallbackPayload({
      routeDescriptor: CreateWorkItemRouteDescriptor,
      ref: CreateWorkItemRef,
    });
    const harness = mountOracleServerHarness({
      harnessId: "server:hq:elysia-runtime-failure",
      runtime,
      payloads: [payload],
    });
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:elysia-runtime-failure",
      prefix: "/rpc",
      payload,
      harness,
      createInvocationContext,
    });
    const host = mountRuntimeElysiaHostBoundary({
      hostId: "elysia:hq:runtime-failure",
      prefix: "/rpc",
      serverBoundary,
    });

    try {
      const response = await host.handle(
        createOrpcRpcRequest({
          executionId: CreateWorkItemRef.executionId,
          requestId: "trace-elysia-runtime-failure",
          input: {
            title: "runtime failure through host",
            secretToken: "elysia-runtime-request-secret",
          },
        })
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;
      expect(body.json.status).toBe("failure");
      expect(host.records()).toContainEqual(
        expect.objectContaining({
          phase: "elysia.host.delegate.finished",
          status: "success",
          httpStatus: 200,
        })
      );
      expect(serverBoundary.records()).toContainEqual(
        expect.objectContaining({
          phase: "orpc.handler.finished",
          status: "failure",
        })
      );
      expect(body.json.runtimeEvents.map((event) => event.name)).toContain(
        "runtime.invoke.failure"
      );
      expect(JSON.stringify(body)).not.toContain("elysia-runtime-failure-secret");
      expect(JSON.stringify(body)).not.toContain("elysia-runtime-request-secret");
    } finally {
      await harness.stop();
      await runtime.dispose();
    }
  });
});
