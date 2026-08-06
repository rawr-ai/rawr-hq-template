import type {
  BeginNativeOperationInput,
  FinishNativeOperationInput,
  NativeOperationTelemetryScope,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { invokeLifecycleProcedure } from "../src/lib/agent-plugins/commands/projection";
import { productionLifecycleProfile } from "../src/lib/agent-plugins/profiles/production";
import { bindProductionLifecycleService } from "../src/lib/agent-plugins/service-runtime/client";
import {
  bindRawrCliTelemetry,
  readRawrCliCommandTelemetry,
  shutdownRawrCliTelemetry,
} from "../src/process-telemetry";
import type { RawrCliTelemetryLifecycle } from "../src/telemetry";

describe("Oclif process telemetry", () => {
  it("shares one shutdown and lets the signal outcome close the admitted command first", async () => {
    const begins: unknown[] = [];
    const finishes: FinishNativeOperationInput[] = [];
    const scope: NativeOperationTelemetryScope = Object.freeze({
      enrich: () => Effect.void,
      finish: (input: FinishNativeOperationInput) =>
        Effect.sync(() => finishes.push(input)).pipe(Effect.asVoid),
    });
    const telemetry: TelemetryResource = Object.freeze({
      processIdentity: {
        serviceName: "rawr-cli-process-test",
        processRole: "cli-test",
        processInstanceId: "cli-process-test-1",
      },
      availability: "available",
      beginNativeOperation: (input: BeginNativeOperationInput) =>
        Effect.sync(() => begins.push(input)).pipe(Effect.as(scope)),
      emitTechnicalLog: () => Effect.void,
      readDiagnostics: () => Effect.succeed(Object.freeze([])),
      flush: () => Effect.succeed({ outcome: "flushed" as const, diagnostics: Object.freeze([]) }),
    });
    const shutdown = vi.fn(async () => ({
      outcome: "flushed" as const,
      diagnostics: Object.freeze([]),
    }));
    const lifecycle: RawrCliTelemetryLifecycle = Object.freeze({ telemetry, shutdown });
    bindRawrCliTelemetry(lifecycle);
    const commandTelemetry = readRawrCliCommandTelemetry();
    await commandTelemetry?.begin({ argvCount: 0, commandId: "agent:plugins:check" });
    const serviceOutcome = await invokeLifecycleProcedure(
      {
        operation: "governance.currentMainRecord",
        input: {
          kind: "encode-body",
          body: {
            schemaVersion: 3,
            channel: "current-main" as const,
            contentAuthority: "rawr-hq",
            sourceRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
            sourceRepositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
            sourceRef: "refs/tags/agent-plugins/current-main/v1",
            contentCommit: "a".repeat(40),
            contentTree: "b".repeat(40),
            releaseInputDigest: `ri1_${"c".repeat(64)}`,
          },
        },
      },
      bindProductionLifecycleService(productionLifecycleProfile)
    );

    const first = shutdownRawrCliTelemetry("cancelled");
    const repeated = shutdownRawrCliTelemetry("failed");

    expect(repeated).toBe(first);
    await expect(first).resolves.toEqual({ outcome: "flushed", diagnostics: [] });
    expect(serviceOutcome.operation).toBe("governance.currentMainRecord");
    expect(begins).toHaveLength(1);
    expect(finishes).toHaveLength(1);
    expect(finishes[0]?.outcome).toBe("cancelled");
    expect(shutdown).toHaveBeenCalledOnce();
    await commandTelemetry?.begin({ argvCount: 0, commandId: "doctor" });
    expect(begins).toHaveLength(1);
  });
});
