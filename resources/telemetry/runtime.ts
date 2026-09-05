import { defineRuntimeResource } from "../../packages/core/runtime/definition/src/resource";
import type { TelemetryResource } from "./contract";

/** Private source-assembly identity; native package exports remain unchanged. */
export const TelemetryRuntimeResource = defineRuntimeResource<"telemetry", TelemetryResource>({
  id: "telemetry",
  title: "Telemetry",
  purpose: "Process-owned technical telemetry",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
