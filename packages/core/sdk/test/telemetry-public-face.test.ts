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
    ]);
  });
});
