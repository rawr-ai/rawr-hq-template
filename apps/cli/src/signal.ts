import type { FinishNativeOperationInput } from "@habitat-ai/resource-telemetry";

type RawrCliSignal = "SIGINT" | "SIGTERM";
type RawrCliCommandOutcome = FinishNativeOperationInput["outcome"];

/** Exact process face used by the CLI's two native termination signals. */
export interface RawrCliSignalHost {
  exitCode: NodeJS.Process["exitCode"];
  off(signal: RawrCliSignal, listener: (signal: RawrCliSignal) => void): unknown;
  once(signal: RawrCliSignal, listener: (signal: RawrCliSignal) => void): unknown;
}

const signalExitCodes: Readonly<Record<RawrCliSignal, number>> = Object.freeze({
  SIGINT: 130,
  SIGTERM: 143,
});

/** Installs one bounded signal owner and returns its idempotent removal operation. */
export function installRawrCliSignalHandlers(
  shutdown: (outcome: RawrCliCommandOutcome) => Promise<unknown>,
  host: RawrCliSignalHost = process
): () => void {
  let handled = false;
  let installed = true;

  const remove = () => {
    if (!installed) return;
    installed = false;
    host.off("SIGINT", onSignal);
    host.off("SIGTERM", onSignal);
  };
  const onSignal = (signal: RawrCliSignal) => {
    if (handled) return;
    handled = true;
    if (host.exitCode == null) host.exitCode = signalExitCodes[signal];
    void shutdown("cancelled").catch(() => undefined);
  };

  host.once("SIGINT", onSignal);
  host.once("SIGTERM", onSignal);
  return remove;
}
