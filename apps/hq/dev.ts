import { type RawrHqAsyncReservation, selectRawrHqAsyncRole } from "./async";
import { bootstrapRawrHqServer, type RawrHqServerBoot, startRawrHqServer } from "./server";

export type RawrHqDevBoot = Readonly<{
  roles: readonly ["server", "async"];
  server: RawrHqServerBoot;
  async: RawrHqAsyncReservation;
}>;

/**
 * Assembles the cohosted HQ development roles without opening a socket.
 */
export async function bootstrapRawrHqDev(): Promise<RawrHqDevBoot> {
  const [server, asyncRole] = await Promise.all([
    bootstrapRawrHqServer(),
    Promise.resolve(selectRawrHqAsyncRole()),
  ]);

  return {
    roles: ["server", "async"],
    server,
    async: asyncRole,
  };
}

/**
 * Starts the HQ development server while retaining the reserved async role.
 */
export async function startRawrHqDev(): Promise<RawrHqDevBoot> {
  const [server, asyncRole] = await Promise.all([
    startRawrHqServer(),
    Promise.resolve(selectRawrHqAsyncRole()),
  ]);

  return {
    roles: ["server", "async"],
    server,
    async: asyncRole,
  };
}

if (import.meta.main) {
  const dev = await startRawrHqDev();
  console.log(`@rawr/hq-app dev server listening on ${dev.server.bootstrapped.config.baseUrl}`);
}
