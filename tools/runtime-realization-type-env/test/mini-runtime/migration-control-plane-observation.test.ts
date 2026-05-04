import { describe, expect, test } from "bun:test";
import {
  createDeploymentRuntimeHandoff,
  createExecutionDescriptorTable,
  createMigrationControlPlaneObservationPacket,
  createRuntimeObservationRecorder,
  projectRuntimeCatalogToTelemetryRecords,
  type CompiledProcessPlan,
  type DeploymentRuntimeHandoff,
  type PortableRuntimePlanArtifact,
} from "../../src/mini-runtime";
import {
  CreateWorkItemPlan,
  PortableArtifact,
  SyncWorkItemStepPlan,
} from "../../fixtures/positive/app-and-plan-artifacts";

function assertNoLiveHandles(value: unknown): void {
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new Error(`migration control-plane packet leaked live handle: ${String(value)}`);
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

function deploymentHandoff(): DeploymentRuntimeHandoff {
  const compiledProcessPlan: CompiledProcessPlan = {
    kind: "compiled.process-plan",
    appId: "hq",
    executionPlans: [CreateWorkItemPlan, SyncWorkItemStepPlan],
  };

  return createDeploymentRuntimeHandoff({
    portableArtifact: PortableArtifact,
    compiledProcessPlan,
  });
}

describe("runtime migration control-plane observation", () => {
  test("correlates deployment handoff, catalog, telemetry, and placement candidates", () => {
    const recorder = createRuntimeObservationRecorder({
      modules: [
        {
          moduleId: "process:server-api",
          metadata: {
            role: "server",
            secretToken: "catalog-module-secret",
          },
        },
      ],
    });
    recorder.record({
      phase: "mount.started",
      subjectId: "harness:server-api",
      attributes: {
        routePath: ["items", "create"],
        apiKey: "catalog-record-secret",
      },
    });
    const catalog = recorder.catalog();
    const telemetryRecords = projectRuntimeCatalogToTelemetryRecords({
      source: "control-plane-catalog",
      runId: "control-plane-run",
      catalog,
    });
    const packet = createMigrationControlPlaneObservationPacket({
      deploymentHandoff: deploymentHandoff(),
      catalog,
      runId: "control-plane-run",
      traceId: "trace:control-plane",
      telemetryRecords,
      telemetryExport: {
        kind: "runtime.telemetry-otlp-export-result",
        status: "accepted",
        endpoint: "http://127.0.0.1:4318/v1/traces",
        httpStatus: 200,
        responseBody: {
          partialSuccess: {},
        },
      },
      correlationId: "trace:control-plane",
      placementCandidates: [
        {
          targetId: "candidate:server-api",
          role: "server",
          surface: "api",
          reason: "server/api surface can be inspected by a future control-plane slice",
          attributes: {
            placementSecret: "candidate-secret",
            otlpPayload: {
              resourceSpans: [{ name: "do-not-copy-payload" }],
            },
            liveHandle() {},
          },
        },
      ],
      attributes: {
        migrationNote: "packet is observation-only",
        runtimeAccess: { kind: "runtime.resource-access" },
        requestBody: { token: "request-body-secret" },
      },
    });
    const packetJson = JSON.stringify(packet);

    expect(packet.kind).toBe("runtime.migration-control-plane-observation-packet");
    expect(packet.correlationId).toBe("trace:control-plane");
    expect(packet.runId).toBe("control-plane-run");
    expect(packet.traceId).toBe("trace:control-plane");
    expect(packet.deployment.executionPlanCount).toBe(2);
    expect(packet.deployment.executionDescriptorRefCount).toBe(2);
    expect(packet.deployment.boundaries).toEqual([
      "plugin.async-step",
      "plugin.server-api",
    ]);
    expect(packet.catalog.moduleCount).toBe(1);
    expect(packet.catalog.recordCount).toBe(1);
    expect(packet.telemetry.runId).toBe("control-plane-run");
    expect(packet.telemetry.traceId).toBe("trace:control-plane");
    expect(packet.telemetry.recordCount).toBe(2);
    expect(packet.telemetry.export?.status).toBe("accepted");
    expect(packet.placementCandidates).toEqual([
      {
        kind: "runtime.migration-control-plane-placement-candidate",
        targetId: "candidate:server-api",
        role: "server",
        surface: "api",
        reason: "server/api surface can be inspected by a future control-plane slice",
        decision: "candidate-only",
        attributes: {
          placementSecret: "[redacted]",
          otlpPayload: "[redacted]",
          liveHandle: "[redacted]",
        },
      },
    ]);
    expect(packetJson).toContain("candidate-only");
    expect(packetJson).toContain("http://127.0.0.1:4318/v1/traces");
    expect(packetJson).not.toContain("catalog-module-secret");
    expect(packetJson).not.toContain("catalog-record-secret");
    expect(packetJson).not.toContain("candidate-secret");
    expect(packetJson).not.toContain("request-body-secret");
    expect(packetJson).not.toContain("do-not-copy-payload");
    expect(packetJson).not.toContain("resourceSpans");
    expect(packetJson).not.toContain("partialSuccess");
    expect(packetJson).not.toContain("descriptorTable");
    assertNoLiveHandles(packet);
  });

  test("rejects widened deployment handoffs before producing migration control-plane packets", () => {
    const safeHandoff = deploymentHandoff();
    const widenedHandoff = {
      ...safeHandoff,
      portableArtifact: {
        ...safeHandoff.portableArtifact,
        descriptorTable: createExecutionDescriptorTable([]),
      },
    } as unknown as DeploymentRuntimeHandoff;
    const catalog = createRuntimeObservationRecorder({}).catalog();

    expect(() =>
      createMigrationControlPlaneObservationPacket({
        deploymentHandoff: widenedHandoff,
        catalog,
        runId: "control-plane-run",
      }),
    ).toThrow("descriptorTable");
  });

  test("rejects app identity drift across handoff summaries", () => {
    const safeHandoff = deploymentHandoff();
    const driftedHandoff = {
      ...safeHandoff,
      portableArtifact: {
        ...safeHandoff.portableArtifact,
        appId: "other-app",
      } satisfies PortableRuntimePlanArtifact,
    } as DeploymentRuntimeHandoff;
    const catalog = createRuntimeObservationRecorder({}).catalog();

    expect(() =>
      createMigrationControlPlaneObservationPacket({
        deploymentHandoff: driftedHandoff,
        catalog,
        runId: "control-plane-run",
      }),
    ).toThrow("appId mismatch");
  });

  test("rejects telemetry records from another run and strips failed export bodies", () => {
    const catalog = createRuntimeObservationRecorder({}).catalog();

    expect(() =>
      createMigrationControlPlaneObservationPacket({
        deploymentHandoff: deploymentHandoff(),
        catalog,
        runId: "expected-run",
        telemetryRecords: [
          {
            kind: "runtime.telemetry-record",
            sequence: 1,
            source: "unit",
            name: "runtime.telemetry.mismatch",
            attributes: {
              telemetryRunId: "other-run",
            },
          },
        ],
      }),
    ).toThrow("telemetry runId mismatch");

    const packet = createMigrationControlPlaneObservationPacket({
      deploymentHandoff: deploymentHandoff(),
      catalog,
      runId: "expected-run",
      telemetryExport: {
        kind: "runtime.telemetry-otlp-export-result",
        status: "failed",
        endpoint: "http://127.0.0.1:4318/v1/traces",
        httpStatus: 500,
        error: {
          responseBody: {
            token: "failed-export-secret",
            resourceSpans: [{ name: "submitted-payload-echo" }],
          },
        },
        responseBody: {
          token: "failed-response-secret",
          resourceSpans: [{ name: "response-payload-echo" }],
        },
      },
    });
    const packetJson = JSON.stringify(packet);

    expect(packet.telemetry.export).toEqual({
      kind: "runtime.telemetry-otlp-export-result",
      status: "failed",
      endpoint: "http://127.0.0.1:4318/v1/traces",
      httpStatus: 500,
    });
    expect(packetJson).not.toContain("failed-export-secret");
    expect(packetJson).not.toContain("failed-response-secret");
    expect(packetJson).not.toContain("submitted-payload-echo");
    expect(packetJson).not.toContain("response-payload-echo");
  });
});
