import {
  createRawrCliCommandTelemetry,
  type RawrCliCommandTelemetry,
} from "./command-telemetry.js";
import type { RawrCliTelemetryLifecycle } from "./telemetry.js";

let activeLifecycle: RawrCliTelemetryLifecycle | undefined;
let commandTelemetry: RawrCliCommandTelemetry | undefined;

/** Binds the process-owned lifecycle before Oclif begins command discovery. */
export function bindRawrCliTelemetry(lifecycle: RawrCliTelemetryLifecycle): void {
  if (activeLifecycle !== undefined) {
    throw new Error("Rawr CLI telemetry is already bound for this process");
  }
  activeLifecycle = lifecycle;
  commandTelemetry = createRawrCliCommandTelemetry(lifecycle.telemetry);
}

/** Returns the one command observer to native Oclif hooks without reacquisition. */
export function readRawrCliCommandTelemetry(): RawrCliCommandTelemetry | undefined {
  return commandTelemetry;
}
