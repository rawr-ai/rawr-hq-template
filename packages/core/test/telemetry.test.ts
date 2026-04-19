import { afterEach, describe, expect, it } from "vitest";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import {
  __appendOtlpSignalPathForTests,
  __resetRawrOrpcTelemetryForTests,
  __resolveRawrOrpcTelemetryOptionsForTests,
  installRawrOrpcTelemetry,
} from "../src/telemetry";

function createExporter(): SpanExporter {
  return {
    export(_spans: ReadableSpan[], resultCallback) {
      resultCallback({ code: 0 });
    },
    async forceFlush() {},
    async shutdown() {},
  };
}

describe("oRPC telemetry bootstrap", () => {
  afterEach(async () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
    await __resetRawrOrpcTelemetryForTests();
  });

  it("installs telemetry once and reports registered instrumentations", async () => {
    const exporter = createExporter();

    const first = await installRawrOrpcTelemetry({
      serviceName: "@rawr/server-test",
      environment: "test",
      traceExporter: exporter,
    });
    const second = await installRawrOrpcTelemetry({
      serviceName: "@rawr/server-test",
      environment: "test",
      traceExporter: exporter,
    });

    expect(second).toBe(first);
    expect(first.instrumentationNames).toEqual(expect.arrayContaining([
      "ORPCInstrumentation",
      "HttpInstrumentation",
    ]));
    expect(first.options.serviceName).toBe("@rawr/server-test");
    expect(first.options.metrics).toBeDefined();
    expect(first.options.metrics?.exportIntervalMillis).toBe(1000);
  });

  it("fails loudly when telemetry is re-installed with incompatible options", async () => {
    const exporter = createExporter();

    await installRawrOrpcTelemetry({
      serviceName: "@rawr/server-test",
      environment: "test",
      traceExporter: exporter,
    });

    await expect(installRawrOrpcTelemetry({
      serviceName: "@rawr/other-server",
      environment: "test",
      traceExporter: exporter,
    })).rejects.toThrow(/incompatible options/);
  });

  it("fails loudly when telemetry is re-installed with incompatible metrics options", async () => {
    const exporter = createExporter();

    await installRawrOrpcTelemetry({
      serviceName: "@rawr/server-test",
      environment: "test",
      traceExporter: exporter,
      metrics: {
        url: "http://127.0.0.1:4318/v1/metrics",
      },
    });

    await expect(installRawrOrpcTelemetry({
      serviceName: "@rawr/server-test",
      environment: "test",
      traceExporter: exporter,
      metrics: {
        url: "http://127.0.0.1:4318/custom/metrics",
      },
    })).rejects.toThrow(/incompatible options/);
  });

  it("derives trace and metrics OTLP HTTP endpoints from the base OTLP endpoint", async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4318";

    const installed = await installRawrOrpcTelemetry({
      serviceName: "@rawr/server-test",
      environment: "test",
      traceExporter: createExporter(),
    });

    expect(installed.options.exporter).toBeDefined();
    expect(installed.options.metrics).toBeDefined();
    expect(installed.options.exporter?.url).toBe("http://127.0.0.1:4318/v1/traces");
    expect(installed.options.metrics?.url).toBe("http://127.0.0.1:4318/v1/metrics");
  });

  it("prefers signal-specific metrics endpoint overrides", async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4318";
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = "http://127.0.0.1:4318/custom/metrics";

    const installed = await installRawrOrpcTelemetry({
      serviceName: "@rawr/server-test",
      environment: "test",
      traceExporter: createExporter(),
    });

    expect(installed.options.exporter).toBeDefined();
    expect(installed.options.metrics).toBeDefined();
    expect(installed.options.exporter?.url).toBe("http://127.0.0.1:4318/v1/traces");
    expect(installed.options.metrics?.url).toBe("http://127.0.0.1:4318/custom/metrics");
  });

  it("appends signal paths only when the OTLP base endpoint has no explicit path", () => {
    expect(__appendOtlpSignalPathForTests("http://127.0.0.1:4318", "/v1/metrics")).toBe("http://127.0.0.1:4318/v1/metrics");
    expect(__appendOtlpSignalPathForTests("http://127.0.0.1:4318/custom", "/v1/metrics")).toBe("http://127.0.0.1:4318/custom");
    expect(__appendOtlpSignalPathForTests(undefined, "/v1/metrics")).toBeUndefined();
  });

  it("resolves metrics options without requiring server install", () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4318";

    const resolved = __resolveRawrOrpcTelemetryOptionsForTests({
      serviceName: "@rawr/server-test",
      metrics: {
        exportIntervalMillis: 2500,
      },
    });

    expect(resolved.exporter.url).toBe("http://127.0.0.1:4318/v1/traces");
    expect(resolved.metrics.url).toBe("http://127.0.0.1:4318/v1/metrics");
    expect(resolved.metrics.exportIntervalMillis).toBe(2500);
  });
});
