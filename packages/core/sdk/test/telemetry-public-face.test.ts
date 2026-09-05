import { describe, expect, test } from "vitest";

import * as telemetry from "../src/telemetry.js";

describe("public telemetry substrate", () => {
  test("exports declarative contracts without provider lifecycle mechanics", () => {
    expect(Object.keys(telemetry).sort()).toEqual([
      "DisabledOpenTelemetryNodeConfigSchema",
      "EmitTechnicalLogInputSchema",
      "EnabledOpenTelemetryNodeConfigSchema",
      "FlushTelemetryInputSchema",
      "FlushTelemetryResultSchema",
      "OpenTelemetryNodeConfigSchema",
      "TelemetryAttributeKeySchema",
      "TelemetryAttributesSchema",
      "TelemetryAvailabilitySchema",
      "TelemetryDiagnosticSchema",
      "TelemetryDiagnosticStageSchema",
      "TelemetryDiagnosticsSchema",
      "TelemetryExportCallbackAccountingSchema",
      "TelemetryIdentityTextSchema",
      "TelemetryLogSeveritySchema",
      "TelemetryProcessIdentitySchema",
      "TelemetryRuntimeResource",
      "defineOpenTelemetryNodeRuntimeProvider",
    ]);
  });

  test("exposes one cold resource/provider identity without sampling finalization or acquiring", () => {
    let deadlines = 0;
    const provider = telemetry.defineOpenTelemetryNodeRuntimeProvider({
      releaseDeadline: () => {
        deadlines++;
        throw new Error("Cold authoring must not sample a finalization deadline");
      },
    });
    expect(provider.provides).toBe(telemetry.TelemetryRuntimeResource);
    expect(provider.provides.id).toBe("telemetry");
    expect(provider.provides.defaultLifetime).toBe("process");
    expect(provider.provides.allowedLifetimes).toEqual(["process"]);
    expect(provider.id).toBe("telemetry.opentelemetry-node");
    expect(provider.configSchema?.redaction).toEqual({
      paths: ["traces.headers", "metrics.headers", "logs.headers"],
    });
    expect(Object.isFrozen(provider)).toBe(true);
    expect(Object.isFrozen(provider.provides)).toBe(true);
    expect(deadlines).toBe(0);
  });
});
