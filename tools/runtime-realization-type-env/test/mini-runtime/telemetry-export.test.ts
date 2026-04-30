import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import { providerFx, defineRuntimeProvider } from "@rawr/sdk/runtime/providers";
import { defineRuntimeResource } from "@rawr/sdk/runtime/resources";
import {
  defineRuntimeProfile,
  providerSelection,
} from "@rawr/sdk/runtime/profiles";
import type { ExecutionDescriptor } from "@rawr/sdk/spine";
import {
  buildRuntimeTelemetryOtlpTracePayload,
  createExecutionDescriptorTable,
  createExecutionRegistry,
  createProcessExecutionRuntime,
  createProviderProvisioningModules,
  createProviderProvisioningTrace,
  createRuntimeBoundaryPolicy,
  executeMiniBootgraph,
  exportRuntimeTelemetryOtlpTraces,
  projectRuntimeCatalogToTelemetryRecords,
  projectRuntimeEventsToTelemetryRecords,
  providerBootResourceModuleId,
  type MiniBootgraphModule,
} from "../../src/mini-runtime";
import { deriveProviderDependencyGraph } from "../../src/spine/derive";
import {
  CreateWorkItemRef,
  type WorkItem,
} from "../../fixtures/positive/app-and-plan-artifacts";

function assertNoLiveHandles(value: unknown): void {
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new Error(`telemetry payload leaked live handle: ${String(value)}`);
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

describe("runtime telemetry export projection", () => {
  test("projects process runtime events with boundary identity and no live handles", async () => {
    const descriptor = {
      kind: "execution.descriptor",
      ref: CreateWorkItemRef,
      run() {
        return Effect.succeed({
          id: "created-telemetry",
          title: "Telemetry",
          status: "open",
        } satisfies WorkItem);
      },
    } satisfies ExecutionDescriptor<unknown, WorkItem, unknown, unknown>;
    const table = createExecutionDescriptorTable([
      { ref: CreateWorkItemRef, descriptor },
    ]);
    const registry = createExecutionRegistry({
      plans: [{ kind: "compiled.execution-plan", ref: CreateWorkItemRef }],
      descriptorTable: table,
    });
    const controller = new AbortController();
    const runtime = createProcessExecutionRuntime({
      registry,
      boundaryPolicy({ ref }) {
        return createRuntimeBoundaryPolicy({
          policyId: "policy:telemetry:create",
          boundary: ref.boundary,
          subjectId: ref.executionId,
          timeoutMs: 250,
          retry: { maxAttempts: 2, attempt: 1 },
          interruption: { signal: controller.signal },
          metadata: {
            apiKey: "process-policy-secret",
            liveHandle() {},
          },
        });
      },
    });

    try {
      const result = await runtime.invoke<WorkItem>({
        ref: CreateWorkItemRef,
        context: {},
      });

      expect(result.status).toBe("success");
      const records = projectRuntimeEventsToTelemetryRecords({
        source: "process-runtime",
        runId: "process-telemetry-run",
        events: result.events,
      });
      const payload = buildRuntimeTelemetryOtlpTracePayload({
        serviceName: "runtime-realization-type-env",
        runId: "process-telemetry-run",
        traceId: "00112233445566778899aabbccddeeff",
        records,
      });
      const payloadJson = JSON.stringify(payload);

      expect(records.map((record) => record.name)).toContain(
        "boundary.policy.exit",
      );
      expect(payloadJson).toContain("policy:telemetry:create");
      expect(payloadJson).toContain("plugin.server-api");
      expect(payloadJson).toContain("process-telemetry-run");
      expect(payloadJson).not.toContain("process-policy-secret");
      assertNoLiveHandles(payload);
    } finally {
      await runtime.dispose();
    }
  });

  test("projects provider provisioning trace without provider values or release handles", async () => {
    interface TelemetrySecretValue {
      readonly token: string;
      close(): void;
    }

    const SecretResource = defineRuntimeResource<
      "telemetry.secret",
      TelemetrySecretValue
    >({
      id: "telemetry.secret",
      title: "Telemetry secret value",
    });
    const SecretProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "telemetry.secret.provider",
      title: "Telemetry secret provider",
      provides: SecretResource,
      requires: [],
      build(context) {
        context.telemetry.event("provider.telemetry.acquire", {
          providerId: "telemetry.secret.provider",
          secretToken: "provider-telemetry-secret",
        });

        return providerFx.acquireRelease({
          acquire: function* () {
            return yield* Effect.succeed({
              token: "live-provider-token",
              close() {},
            } satisfies TelemetrySecretValue);
          },
          release: () => Effect.sync(() => undefined),
        });
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "telemetry.provider.profile",
      providerSelections: [
        providerSelection({
          resource: SecretResource,
          provider: SecretProvider,
          lifetime: "process",
          role: "server",
        }),
      ],
    });
    const trace = createProviderProvisioningTrace();
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: deriveProviderDependencyGraph(profile),
      processId: "telemetry-process",
      trace,
      configs: {
        [SecretProvider.id]: {
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

    const result = await executeMiniBootgraph({ modules });
    expect(result.status).toBe("started");
    if (result.status !== "started") throw result.error;
    await result.finalize();

    const records = projectRuntimeEventsToTelemetryRecords({
      source: "provider-provisioning",
      runId: "provider-telemetry-run",
      events: trace.events,
    });
    const payload = buildRuntimeTelemetryOtlpTracePayload({
      serviceName: "runtime-realization-type-env",
      runId: "provider-telemetry-run",
      records,
    });
    const payloadJson = JSON.stringify(payload);

    expect(records.map((record) => record.name)).toContain(
      "provider.telemetry.acquire",
    );
    expect(payloadJson).toContain("provider.acquire");
    expect(payloadJson).toContain("provider.release");
    expect(payloadJson).toContain("telemetry.secret.provider");
    expect(payloadJson).not.toContain("provider-telemetry-secret");
    expect(payloadJson).not.toContain("provider-policy-secret");
    expect(payloadJson).not.toContain("provider-config-secret");
    expect(payloadJson).not.toContain("live-provider-token");
    expect(payloadJson).not.toContain("close");
    assertNoLiveHandles(payload);
  });

  test("projects bootgraph catalog records without started module values", async () => {
    const modules: MiniBootgraphModule[] = [
      {
        kind: "mini-runtime.boot-module",
        id: "telemetry.module",
        metadata: {
          publicLabel: "telemetry module",
          secretToken: "module-metadata-secret",
        },
        start() {
          return {
            token: "started-module-secret",
            liveHandle() {},
          };
        },
      },
    ];
    const result = await executeMiniBootgraph({ modules });

    expect(result.status).toBe("started");
    if (result.status !== "started") throw result.error;

    const records = projectRuntimeCatalogToTelemetryRecords({
      source: "bootgraph-catalog",
      runId: "catalog-telemetry-run",
      catalog: result.catalog(),
    });
    const payload = buildRuntimeTelemetryOtlpTracePayload({
      serviceName: "runtime-realization-type-env",
      runId: "catalog-telemetry-run",
      records,
    });
    const payloadJson = JSON.stringify(payload);

    expect(records.map((record) => record.name)).toEqual([
      "runtime.catalog.module",
      "boot.start",
      "boot.started",
    ]);
    expect(payloadJson).toContain("telemetry.module");
    expect(payloadJson).toContain("catalog-telemetry-run");
    expect(payloadJson).not.toContain("module-metadata-secret");
    expect(payloadJson).not.toContain("started-module-secret");
    assertNoLiveHandles(payload);
  });

  test("exports stable OTLP trace payload with an injected fetcher", async () => {
    const records = projectRuntimeEventsToTelemetryRecords({
      source: "unit",
      runId: "export-telemetry-run",
      events: [
        {
          name: "runtime.export.test",
          attributes: {
            policyId: "policy:export",
            requestToken: "export-secret",
          },
        },
      ],
    });
    const payload = buildRuntimeTelemetryOtlpTracePayload({
      serviceName: "runtime-realization-type-env",
      runId: "export-telemetry-run",
      records,
    });
    let captured:
      | {
          readonly url: string;
          readonly method: string;
          readonly headers: Record<string, string>;
          readonly body: string;
        }
      | undefined;

    const result = await exportRuntimeTelemetryOtlpTraces({
      endpoint: "http://127.0.0.1:4318",
      payload,
      fetch: async (url, init) => {
        captured = {
          url,
          method: init.method,
          headers: init.headers,
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

    expect(result.status).toBe("accepted");
    expect(captured?.url).toBe("http://127.0.0.1:4318/v1/traces");
    expect(captured?.method).toBe("POST");
    expect(captured?.headers["content-type"]).toBe("application/json");
    expect(captured?.body).toContain("runtime.export.test");
    expect(captured?.body).not.toContain("export-secret");
    assertNoLiveHandles(JSON.parse(captured?.body ?? "{}"));
  });
});
