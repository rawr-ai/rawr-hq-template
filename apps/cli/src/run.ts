import { flush, handle, run } from "@oclif/core";

import { bindRawrCliTelemetry, shutdownRawrCliTelemetry } from "./process-telemetry.js";
import { installRawrCliSignalHandlers } from "./signal.js";
import { acquireRawrCliTelemetry, selectRawrCliTelemetryConfig } from "./telemetry.js";

/** Native Oclif entrypoint inputs shared by source and compiled launchers. */
export type RawrCliRunOptions = Readonly<{
  args?: string[];
  development?: boolean;
  dir: string;
}>;

/** Runs one Oclif process inside the app-owned telemetry lifecycle. */
export async function runRawrCli(options: RawrCliRunOptions): Promise<unknown> {
  if (options.development === true) {
    process.env.NODE_ENV = "development";
  }

  const lifecycle = await acquireRawrCliTelemetry(selectRawrCliTelemetryConfig());
  bindRawrCliTelemetry(lifecycle);
  const removeSignalHandlers = installRawrCliSignalHandlers(shutdownRawrCliTelemetry);
  let result: unknown;
  let failure: unknown;
  let failed = false;

  try {
    result = await run(options.args ?? process.argv.slice(2), options.dir);
  } catch (error) {
    failed = true;
    failure = error;
  } finally {
    await shutdownRawrCliTelemetry().catch(() => undefined);
    removeSignalHandlers();
    await flush().catch(() => undefined);
  }

  if (failed) {
    await handle(failure as Parameters<typeof handle>[0]);
  }
  return result;
}
