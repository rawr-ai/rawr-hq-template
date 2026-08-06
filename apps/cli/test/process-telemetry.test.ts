import type {
  FinishNativeOperationInput,
  NativeOperationTelemetryScope,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import {
  bindRawrCliTelemetry,
  readRawrCliCommandTelemetry,
  shutdownRawrCliTelemetry,
} from "../src/process-telemetry";
import type { RawrCliTelemetryLifecycle } from "../src/telemetry";

describe("Oclif process telemetry", () => {
  it("shares one shutdown and lets the signal outcome close the admitted command first", async () => {
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
      beginNativeOperation: () => Effect.succeed(scope),
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
    await readRawrCliCommandTelemetry()?.begin({ argvCount: 0, commandId: "doctor" });

    const first = shutdownRawrCliTelemetry("cancelled");
    const repeated = shutdownRawrCliTelemetry("failed");

    expect(repeated).toBe(first);
    await expect(first).resolves.toEqual({ outcome: "flushed", diagnostics: [] });
    expect(finishes).toHaveLength(1);
    expect(finishes[0]?.outcome).toBe("cancelled");
    expect(shutdown).toHaveBeenCalledOnce();
  });
});
