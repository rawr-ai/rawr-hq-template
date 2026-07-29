import { bootstrapServerHost, startServerHost } from "@rawr/server/host";
import { createRawrHqManifest, type RawrHqManifest } from "./rawr.hq";

/** The selected HQ server role together with its server-owned realized host. */
export type RawrHqServerBoot = Readonly<{
  manifest: RawrHqManifest;
  role: "server";
  bootstrapped: Awaited<ReturnType<typeof bootstrapServerHost>>;
}>;

function selectServerDeclarations(manifest: RawrHqManifest) {
  return {
    api: manifest.roles.server.api,
    workflows: manifest.roles.async.workflows,
  } as const;
}

/**
 * Selects the HQ server role and assembles its host without opening a socket.
 */
export async function bootstrapRawrHqServer(): Promise<RawrHqServerBoot> {
  const manifest = createRawrHqManifest();
  const bootstrapped = await bootstrapServerHost({
    declarations: selectServerDeclarations(manifest),
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
export async function startRawrHqServer(): Promise<RawrHqServerBoot> {
  const manifest = createRawrHqManifest();
  const bootstrapped = await startServerHost({
    declarations: selectServerDeclarations(manifest),
  });

  return {
    manifest,
    role: "server",
    bootstrapped,
  };
}

if (import.meta.main) {
  const server = await startRawrHqServer();
  console.log(`@rawr/hq-app server listening on ${server.bootstrapped.config.baseUrl}`);
}
