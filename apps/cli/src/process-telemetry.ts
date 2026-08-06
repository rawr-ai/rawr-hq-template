import type { FinishNativeOperationInput } from "@habitat-ai/resource-telemetry";
import {
  createRawrCliCommandTelemetry,
  type RawrCliCommandTelemetry,
} from "./command-telemetry.js";
import type { RawrCliTelemetryLifecycle } from "./telemetry.js";

let activeLifecycle: RawrCliTelemetryLifecycle | undefined;
let commandTelemetry: RawrCliCommandTelemetry | undefined;
let shutdownPromise: ReturnType<RawrCliTelemetryLifecycle["shutdown"]> | undefined;

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

/** Closes the admitted command event, then shares one bounded provider shutdown. */
export function shutdownRawrCliTelemetry(
  outcome?: FinishNativeOperationInput["outcome"]
): Promise<Awaited<ReturnType<RawrCliTelemetryLifecycle["shutdown"]>> | undefined> {
  if (shutdownPromise !== undefined) return shutdownPromise;
  const lifecycle = activeLifecycle;
  if (lifecycle === undefined) return Promise.resolve(undefined);

  shutdownPromise = (async () => {
    if (outcome !== undefined) await commandTelemetry?.finish(outcome);
    return lifecycle.shutdown();
  })();
  return shutdownPromise;
}
