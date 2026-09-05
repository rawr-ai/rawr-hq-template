import { expect, test } from "bun:test";

import { TelemetryRuntimeResource } from "../../../runtime";
import { defineOpenTelemetryNodeRuntimeProvider } from "../runtime";

test("authors a cold private provider with the neutral process identity and native config", () => {
  let deadlines = 0;
  const provider = defineOpenTelemetryNodeRuntimeProvider({
    releaseDeadline: () => {
      deadlines += 1;
      return { deadlineMonotonicMilliseconds: performance.now() + 1_000 };
    },
  });
  const config = {
    enabled: false,
    processIdentity: {
      serviceName: "telemetry-authoring",
      serviceVersion: "test",
      deploymentEnvironment: "test",
      processRole: "test",
      processInstanceId: "one",
    },
  };
  expect(provider.provides).toBe(TelemetryRuntimeResource);
  expect(provider.provides.allowedLifetimes).toEqual(["process"]);
  expect(provider.requires).toEqual([]);
  expect(provider.configSchema?.decode(config).success).toBe(true);
  expect(provider.configSchema?.decode({ ...config, enabled: "false" }).success).toBe(false);
  expect(provider.configSchema?.redaction?.paths).toEqual([
    "traces.headers",
    "metrics.headers",
    "logs.headers",
  ]);
  expect(deadlines).toBe(0);
  expect(Object.isFrozen(provider)).toBe(true);
});
