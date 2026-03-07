import { afterEach, describe, expect, it } from "vitest";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { __resetRawrOrpcTelemetryForTests, installRawrOrpcTelemetry } from "../src/orpc/telemetry";

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
});
