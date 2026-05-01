import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import type {
  ExecutionDescriptor,
  WorkflowDispatcher,
} from "@rawr/sdk/spine";
import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import {
  buildRuntimeTelemetryOtlpTracePayload,
  createDeploymentRuntimeHandoff,
  createExecutionDescriptorTable,
  createExecutionRegistry,
  createMigrationControlPlaneObservationPacket,
  createOracleResourceAccess,
  createProcessExecutionRuntime,
  createRuntimeObservationRecorder,
  exportRuntimeTelemetryOtlpTraces,
  mountOracleServerHarness,
  mountRuntimeElysiaHostBoundary,
  mountRuntimeOrpcServerBoundary,
  projectRuntimeEventsToTelemetryRecords,
  startRuntimeElysiaListener,
  type CompiledProcessPlan,
  type RuntimeTelemetryEventLike,
  type RuntimeTelemetryRecord,
  type StartedRuntimeElysiaListener,
} from "../../../src/oracle";
import { createServerAdapterCallbackPayload } from "../../../src/adapters/server";
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
import type { RuntimeOrpcServerResponse } from "../../../src/oracle/adapters/orpc-server";

interface OrpcEncoded<T> {
  readonly json: T;
}

function assertNoLiveHandles(value: unknown): void {
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new Error(
      `contained Elysia listener proof leaked live handle: ${String(value)}`,
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
                id: "created-via-listener",
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
      return { runId: "run-elysia-listener" };
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
          return { id: "actor-elysia-listener" };
        },
      },
      clients: createClients(),
      resources: createOracleResourceAccess([
        {
          id: "elysia-listener-resource",
          value: { seen: true },
          metadata: {
            secretToken: "elysia-listener-resource-secret",
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
      traceId: request.requestId ?? "trace-elysia-listener",
      secretToken: "elysia-listener-execution-secret",
    },
  };
}

function createRuntime(
  descriptor: ExecutionDescriptor = CreateWorkItemDescriptor,
) {
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

function createOrpcRpcInit(input: unknown): RequestInit {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-listener-secret-token": "listener-header-secret",
    },
    body: JSON.stringify({ json: input }),
  };
}

describe("phase three contained Elysia listen lifecycle passage", () => {
  test("starts a real local listener, handles network passage, stops, and rejects post-stop delegation", async () => {
    const runId = "phase-three-elysia-listener-run";
    const traceId = "223344556677889900aabbccddeeff11";
    const runtime = createRuntime();
    const telemetryRecords: RuntimeTelemetryRecord[] = [];
    const originalFetch = globalThis.fetch;
    const networkFetchUrls: string[] = [];
    let listener: StartedRuntimeElysiaListener | undefined;
    const payload = createServerAdapterCallbackPayload({
      routeDescriptor: CreateWorkItemRouteDescriptor,
      ref: CreateWorkItemRef,
    });
    const harness = mountOracleServerHarness({
      harnessId: "server:hq:elysia-listener",
      runtime,
      payloads: [payload],
    });
    const serverBoundary = mountRuntimeOrpcServerBoundary({
      boundaryId: "orpc:hq:elysia-listener",
      prefix: "/rpc",
      payload,
      harness,
      createInvocationContext,
    });
    const host = mountRuntimeElysiaHostBoundary({
      hostId: "elysia:hq:listener",
      prefix: "/rpc",
      serverBoundary,
    });

    try {
      globalThis.fetch = ((input, init) => {
        networkFetchUrls.push(String(input));
        return originalFetch(input, init);
      }) as typeof fetch;

      listener = startRuntimeElysiaListener({
        listenerId: "listener:hq:api",
        host,
      });

      expect(listener.hostname).toBe("127.0.0.1");
      expect(listener.port).toBeGreaterThan(0);
      expect(listener.url.protocol).toBe("http:");
      expect(String(listener.url)).toContain(`127.0.0.1:${listener.port}`);
      expect(listener.records().map((record) => record.phase)).toEqual([
        "elysia.listener.starting",
        "elysia.listener.vendor.started",
        "elysia.listener.started",
      ]);
      expect(host.app.server).not.toBeNull();

      const requestUrl = new URL("/rpc/invoke", listener.url);
      const response = await globalThis.fetch(
        requestUrl,
        createOrpcRpcInit({
          executionId: CreateWorkItemRef.executionId,
          requestId: traceId,
          input: {
            title: "Elysia listener passage",
            secretToken: "elysia-listener-request-secret",
          },
        }),
      );
      expect(response.status).toBe(200);
      const body =
        (await response.json()) as OrpcEncoded<RuntimeOrpcServerResponse>;

      expect(body.json.status).toBe("success");
      expect(body.json.output).toEqual({
        id: "created-via-listener",
        title: "Elysia listener passage",
        status: "open",
      });
      expect(listener.records()).toContainEqual(
        expect.objectContaining({
          phase: "elysia.listener.network.request.start",
          method: "POST",
          path: "/rpc/invoke",
          url: String(requestUrl),
        }),
      );
      expect(networkFetchUrls).toEqual([String(requestUrl)]);
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
      expect(harness.records()).toContainEqual(
        expect.objectContaining({
          phase: "harness.invoke.finished",
          status: "success",
        }),
      );
      expect(body.json.runtimeEvents.map((event) => event.name)).toContain(
        "runtime.invoke.success",
      );

      const countsBeforeStop = {
        listener: listener.records().length,
        host: host.records().length,
        orpc: serverBoundary.records().length,
        harness: harness.records().length,
        runtimeEvents: body.json.runtimeEvents.length,
      };

      await listener.stop(true);
      expect(host.app.server).toBeNull();
      expect(listener.records().map((record) => record.phase)).toEqual([
        "elysia.listener.starting",
        "elysia.listener.vendor.started",
        "elysia.listener.started",
        "elysia.listener.network.request.start",
        "elysia.listener.stopping",
        "elysia.listener.vendor.stopped",
        "elysia.listener.stopped",
      ]);

      await expect(
        globalThis.fetch(
          requestUrl,
          createOrpcRpcInit({
            executionId: CreateWorkItemRef.executionId,
            requestId: "trace-post-stop-listener",
            input: {
              title: "should not delegate after listener stop",
            },
          }),
        ),
      ).rejects.toThrow();
      expect(networkFetchUrls).toEqual([
        String(requestUrl),
        String(requestUrl),
      ]);

      expect(listener.records().slice(countsBeforeStop.listener).map((record) => record.phase)).toEqual([
        "elysia.listener.stopping",
        "elysia.listener.vendor.stopped",
        "elysia.listener.stopped",
      ]);
      expect(host.records()).toHaveLength(countsBeforeStop.host);
      expect(serverBoundary.records()).toHaveLength(countsBeforeStop.orpc);
      expect(harness.records()).toHaveLength(countsBeforeStop.harness);
      expect(body.json.runtimeEvents).toHaveLength(countsBeforeStop.runtimeEvents);

      appendTelemetryRecords(telemetryRecords, {
        source: "phase-three.elysia.listener",
        runId,
        events: listener.records().map(recordEvent),
      });
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
            record.source === "phase-three.elysia.listener" &&
            record.name === "elysia.listener.started",
        ),
      ).toBe(true);
      expect(
        telemetryRecords.some(
          (record) =>
            record.source === "phase-three.elysia.listener" &&
            record.name === "elysia.listener.network.request.start",
        ),
      ).toBe(true);
      expect(
        telemetryRecords.some(
          (record) =>
            record.source === "phase-three.elysia.host" &&
            record.name === "elysia.host.delegate.finished",
        ),
      ).toBe(true);
      expect(
        telemetryRecords.some(
          (record) =>
            record.source === "phase-three.elysia.runtime" &&
            record.name === "runtime.invoke.success",
        ),
      ).toBe(true);

      const otlpPayload = buildRuntimeTelemetryOtlpTracePayload({
        serviceName: "runtime-realization-type-env",
        runId,
        traceId,
        records: telemetryRecords,
        resourceAttributes: {
          phase: "phase-three",
          secretToken: "elysia-listener-telemetry-secret",
        },
      });
      const otlpJson = JSON.stringify(otlpPayload);
      expect(otlpJson).toContain("elysia.listener.started");
      expect(otlpJson).toContain("elysia.listener.network.request.start");
      expect(otlpJson).toContain("elysia.host.delegate.finished");
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
            targetId: "candidate:elysia-listener",
            role: "server",
            surface: "api",
            reason: "contained Elysia listen lifecycle remains lab correlation",
            attributes: {
              requestBody: {
                secretToken: "control-plane-listener-secret",
              },
              liveHandle() {},
            },
          },
        ],
        attributes: {
          observationNote: "Elysia listener lifecycle is simulation proof only",
          otlpPayload,
        },
      });
      expect(packet.telemetry.sources).toContain("phase-three.elysia.listener");
      expect(packet.telemetry.sources).toContain("phase-three.elysia.host");
      expect(packet.telemetry.sources).toContain("phase-three.elysia.orpc");
      expect(packet.telemetry.sources).toContain("phase-three.elysia.runtime");
      expect(packet.telemetry.names).toContain("elysia.listener.stopped");
      expect(packet.telemetry.names).toContain(
        "elysia.listener.network.request.start",
      );
      expect(packet.telemetry.export).toEqual({
        kind: "runtime.telemetry-otlp-export-result",
        status: "accepted",
        endpoint: "http://127.0.0.1:4318/v1/traces",
        httpStatus: 202,
      });

      for (const secret of [
        "listener-header-secret",
        "elysia-listener-request-secret",
        "elysia-listener-resource-secret",
        "elysia-listener-execution-secret",
        "elysia-listener-telemetry-secret",
        "control-plane-listener-secret",
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
      globalThis.fetch = originalFetch;
      if (listener) await listener.stop(true).catch(() => undefined);
      await harness.stop();
      await runtime.dispose();
    }
  });
});
