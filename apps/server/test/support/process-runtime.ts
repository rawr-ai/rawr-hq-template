import { makeDisabledOpenTelemetryNodeResource } from "@habitat-ai/resource-telemetry/providers/opentelemetry-node";
import { Context } from "effect";
import { Inngest } from "inngest";

import type { ServerTelemetryLifecycle } from "../../src/telemetry";

const disabledConfig = Object.freeze({
  enabled: false as const,
  processIdentity: Object.freeze({
    serviceName: "rawr-hq-test",
    deploymentEnvironment: "test",
    processRole: "server-test",
    processInstanceId: "server-test-1",
  }),
});

/** Returns the inert process telemetry value used by owner-local server tests. */
export function createTestingServerTelemetry(): ServerTelemetryLifecycle {
  return Object.freeze({
    telemetry: makeDisabledOpenTelemetryNodeResource(disabledConfig),
    effectContext: Object.freeze({ "effect/context": Context.empty() }),
    evlogDrain: async () => {},
    shutdown: async () => Object.freeze({ outcome: "flushed", diagnostics: Object.freeze([]) }),
  });
}

/** Returns one product Inngest client and its inert telemetry process value. */
export function createTestingServerProcessRuntime(): Readonly<{
  inngestClient: Inngest;
  telemetry: ServerTelemetryLifecycle;
}> {
  return Object.freeze({
    inngestClient: new Inngest({ id: "rawr-hq-server-test" }),
    telemetry: createTestingServerTelemetry(),
  });
}
