import type { RawrCliTelemetryLifecycle } from "./telemetry.js";

let activeLifecycle: RawrCliTelemetryLifecycle | undefined;

/** Binds the process-owned lifecycle before Oclif begins command discovery. */
export function bindRawrCliTelemetry(lifecycle: RawrCliTelemetryLifecycle): void {
  if (activeLifecycle !== undefined) {
    throw new Error("Rawr CLI telemetry is already bound for this process");
  }
  activeLifecycle = lifecycle;
}
