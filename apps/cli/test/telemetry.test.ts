import { describe, expect, it } from "vitest";

import { acquireRawrCliTelemetry, selectRawrCliTelemetryConfig } from "../src/telemetry";

const PROCESS_INSTANCE_ID = "rawr-cli-telemetry-test";

function select(env: Readonly<Record<string, string | undefined>>) {
  return selectRawrCliTelemetryConfig({
    env,
    generateProcessInstanceId: () => PROCESS_INSTANCE_ID,
  });
}

describe("Rawr CLI telemetry", () => {
  it("selects the disabled provider without a complete exporter topology", () => {
    expect(select({})).toEqual({
      enabled: false,
      processIdentity: {
        serviceName: "rawr",
        processRole: "cli",
        processInstanceId: PROCESS_INSTANCE_ID,
      },
    });
  });

  it("derives one complete provider topology from the standard OTLP endpoint", () => {
    const config = select({
      NODE_ENV: "test",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example.test:4318/tenant/",
      OTEL_SERVICE_NAME: "habitat-cli",
      RAWR_CLI_VERSION: "0.1.0",
      RAWR_TELEMETRY_RECEIPT_ID: "receipt-cli-001",
    });

    if (!config.enabled) throw new Error("expected enabled CLI telemetry");
    expect(config.processIdentity).toEqual({
      serviceName: "habitat-cli",
      serviceVersion: "0.1.0",
      deploymentEnvironment: "test",
      processRole: "cli",
      processInstanceId: PROCESS_INSTANCE_ID,
    });
    expect(config.traces.url).toBe("https://collector.example.test:4318/tenant/v1/traces");
    expect(config.metrics.url).toBe("https://collector.example.test:4318/tenant/v1/metrics");
    expect(config.logs.url).toBe("https://collector.example.test:4318/tenant/v1/logs");
    expect(config.defaultAttributes).toEqual({ "receipt.id": "receipt-cli-001" });
    expect(config.exportedAttributePaths).toEqual([
      "receipt.id",
      "cli.command.id",
      "cli.command.plugin",
      "cli.argv.count",
      "duration.ms",
    ]);
  });

  it("acquires the disabled resource and shares one shutdown result", async () => {
    const lifecycle = await acquireRawrCliTelemetry(select({ OTEL_SDK_DISABLED: "true" }));
    const first = lifecycle.shutdown();

    expect(lifecycle.telemetry.availability).toBe("disabled");
    expect(lifecycle.shutdown()).toBe(first);
    await expect(first).resolves.toEqual({ outcome: "flushed", diagnostics: [] });
  });
});
