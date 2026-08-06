import { describe, expect, it, vi } from "vitest";
import { selectRawrHqTelemetryConfig } from "../telemetry";

const PROCESS_INSTANCE_ID = "hq-telemetry-test-instance";

function select(env: Readonly<Record<string, string | undefined>>) {
  return selectRawrHqTelemetryConfig({
    env,
    generateProcessInstanceId: () => PROCESS_INSTANCE_ID,
  });
}

describe("HQ telemetry selection", () => {
  it("selects the disabled provider when no complete OTLP endpoint is configured", () => {
    const generateProcessInstanceId = vi.fn(() => PROCESS_INSTANCE_ID);

    const config = selectRawrHqTelemetryConfig({
      env: {},
      generateProcessInstanceId,
    });

    expect(config).toEqual({
      enabled: false,
      processIdentity: {
        serviceName: "rawr-hq",
        processRole: "server",
        processInstanceId: PROCESS_INSTANCE_ID,
      },
    });
    expect(generateProcessInstanceId).toHaveBeenCalledOnce();
  });

  it("honors the standard SDK disable flag before a complete exporter selection", () => {
    const config = select({
      OTEL_SDK_DISABLED: " TRUE ",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example.test:4318",
    });

    expect(config.enabled).toBe(false);
  });

  it("derives one complete HTTP exporter config from the standard base endpoint", () => {
    const config = select({
      OTEL_SERVICE_NAME: " rawr-hq-test ",
      NODE_ENV: " test ",
      RAWR_SERVER_VERSION: " 1.2.3 ",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example.test:4318/tenant/",
    });

    if (!config.enabled) throw new Error("expected enabled telemetry");

    expect(config.processIdentity).toEqual({
      serviceName: "rawr-hq-test",
      serviceVersion: "1.2.3",
      deploymentEnvironment: "test",
      processRole: "server",
      processInstanceId: PROCESS_INSTANCE_ID,
    });
    expect(config.traces).toEqual({
      url: "https://collector.example.test:4318/tenant/v1/traces",
      headers: {},
      timeoutMilliseconds: 10_000,
    });
    expect(config.metrics).toEqual({
      url: "https://collector.example.test:4318/tenant/v1/metrics",
      headers: {},
      timeoutMilliseconds: 10_000,
    });
    expect(config.logs).toEqual({
      url: "https://collector.example.test:4318/tenant/v1/logs",
      headers: {},
      timeoutMilliseconds: 10_000,
    });
    expect(config.metricExportIntervalMilliseconds).toBe(60_000);
    expect(config.shutdownFallbackMilliseconds).toBe(10_000);
    expect(config.defaultAttributes).toEqual({});
  });

  it("uses complete signal-specific endpoints and lets them override the base", () => {
    const config = select({
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example.test:4318/base",
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://traces.example.test/v1/traces",
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://metrics.example.test/v1/metrics",
      OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: "https://logs.example.test/v1/logs",
    });

    if (!config.enabled) throw new Error("expected enabled telemetry");

    expect(config.traces.url).toBe("https://traces.example.test/v1/traces");
    expect(config.metrics.url).toBe("https://metrics.example.test/v1/metrics");
    expect(config.logs.url).toBe("https://logs.example.test/v1/logs");
  });

  it("enables without a base only when all three signal endpoints are valid", () => {
    const complete = select({
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://127.0.0.1:4318/v1/traces",
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "http://127.0.0.1:4318/v1/metrics",
      OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: "http://127.0.0.1:4318/v1/logs",
    });
    const incomplete = select({
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://127.0.0.1:4318/v1/traces",
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "http://127.0.0.1:4318/v1/metrics",
    });

    expect(complete.enabled).toBe(true);
    expect(incomplete.enabled).toBe(false);
  });

  it("does not produce an enabled config from invalid or over-limit endpoints", () => {
    expect(
      select({ OTEL_EXPORTER_OTLP_ENDPOINT: "grpc://collector.example.test:4317" }).enabled
    ).toBe(false);
    expect(
      select({ OTEL_EXPORTER_OTLP_ENDPOINT: `http://example.test/${"x".repeat(2_048)}` }).enabled
    ).toBe(false);
    expect(
      select({
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example.test:4318",
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: "not a URL",
      }).enabled
    ).toBe(false);
  });

  it("uses one unique bounded export allowlist for receipt and native correlation", () => {
    const config = select({
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:4318",
    });

    if (!config.enabled) throw new Error("expected enabled telemetry");

    expect(config.exportedAttributePaths.length).toBeLessThanOrEqual(26);
    expect(new Set(config.exportedAttributePaths).size).toBe(config.exportedAttributePaths.length);
    expect(config.exportedAttributePaths).toEqual(
      expect.arrayContaining([
        "receipt.id",
        "request.id",
        "correlation.id",
        "rpc.method",
        "inngest.run.id",
        "inngest.attempt.id",
        "inngest.traceparent",
        "sdk.run.id",
      ])
    );
  });
});
