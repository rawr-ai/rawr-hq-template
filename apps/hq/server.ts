import { bootstrapServerHost, startServerHost } from "@rawr/server/host";
import { createRawrHqManifest, type RawrHqManifest } from "./rawr.hq";
import { type RawrHqTelemetrySelectionOptions, selectRawrHqTelemetryConfig } from "./telemetry";

/** The selected HQ server role together with its server-owned realized host. */
export type RawrHqServerBoot = Readonly<{
  manifest: RawrHqManifest;
  role: "server";
  bootstrapped: Awaited<ReturnType<typeof bootstrapServerHost>>;
}>;

type RawrHqServerSignal = "SIGINT" | "SIGTERM";

type RawrHqServerSignalHost = {
  exitCode: typeof process.exitCode;
  once(signal: RawrHqServerSignal, listener: () => void): unknown;
  off(signal: RawrHqServerSignal, listener: () => void): unknown;
};

function selectServerDeclarations(manifest: RawrHqManifest) {
  return {
    api: manifest.roles.server.api,
    workflows: manifest.roles.async.workflows,
  } as const;
}

/**
 * Selects the HQ server role and assembles its host without opening a socket.
 */
export async function bootstrapRawrHqServer(
  telemetryOptions: RawrHqTelemetrySelectionOptions = {}
): Promise<RawrHqServerBoot> {
  const manifest = createRawrHqManifest();
  const bootstrapped = await bootstrapServerHost({
    declarations: selectServerDeclarations(manifest),
    telemetryConfig: selectRawrHqTelemetryConfig(telemetryOptions),
  });

  return {
    manifest,
    role: "server",
    bootstrapped,
  };
}

/**
 * Starts the HQ server process selected by this application entrypoint.
 */
export async function startRawrHqServer(
  telemetryOptions: RawrHqTelemetrySelectionOptions = {}
): Promise<RawrHqServerBoot> {
  const manifest = createRawrHqManifest();
  const bootstrapped = await startServerHost({
    declarations: selectServerDeclarations(manifest),
    telemetryConfig: selectRawrHqTelemetryConfig(telemetryOptions),
  });

  return {
    manifest,
    role: "server",
    bootstrapped,
  };
}

/**
 * Installs the HQ app's sole server-signal owner. The first signal preserves
 * an existing process result or selects the native shell status, then shares
 * the server host's one bounded shutdown completion.
 */
export function installRawrHqServerShutdownSignals(
  server: RawrHqServerBoot["bootstrapped"],
  signalHost: RawrHqServerSignalHost = process
): () => void {
  let shutdownPromise: Promise<void> | undefined;

  const remove = () => {
    signalHost.off("SIGINT", onSigint);
    signalHost.off("SIGTERM", onSigterm);
  };
  const shutdown = (signal: RawrHqServerSignal) => {
    remove();
    if (signalHost.exitCode === undefined) {
      signalHost.exitCode = signal === "SIGINT" ? 130 : 143;
    }
    shutdownPromise ??= server.shutdown().catch(() => undefined);
  };
  const onSigint = () => shutdown("SIGINT");
  const onSigterm = () => shutdown("SIGTERM");

  signalHost.once("SIGINT", onSigint);
  signalHost.once("SIGTERM", onSigterm);
  return remove;
}

if (import.meta.main) {
  const server = await startRawrHqServer();
  installRawrHqServerShutdownSignals(server.bootstrapped);
  console.log(`@rawr/hq-app server listening on ${server.bootstrapped.config.baseUrl}`);
}
