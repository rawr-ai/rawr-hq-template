import { defineProcessCatalog } from "@habitat-ai/sdk/app";
import { requireResource } from "@habitat-ai/sdk/runtime/resources";
import { TelemetryRuntimeResource } from "@habitat-ai/sdk/telemetry";

export const processes = defineProcessCatalog({
  cli: {
    id: "cli",
    roles: ["cli"],
    harness: "habitat.oclif",
    resourceRequirements: [
      requireResource({ resource: TelemetryRuntimeResource, reason: "Native CLI instrumentation" }),
    ],
  },
});
