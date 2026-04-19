import { bootstrapServer, type BootstrappedServer } from "../server/src/bootstrap";
import type { RawrHqManifest } from "./rawr.hq";

export type RawrHqLegacyServerDependencies = {
  bootstrapServer?: typeof bootstrapServer;
};

export type RawrHqLegacyServerBoot = Readonly<{
  manifest: RawrHqManifest;
  role: "server";
  bootstrapped: BootstrappedServer;
}>;

export type RawrHqAsyncReservation = Readonly<{
  manifest: RawrHqManifest;
  role: "async";
  status: "reserved";
  workflows: readonly string[];
  schedules: readonly string[];
}>;

export type RawrHqLegacyDevBoot = Readonly<{
  manifest: RawrHqManifest;
  roles: readonly ["server", "async"];
  server: RawrHqLegacyServerBoot;
  async: RawrHqAsyncReservation;
}>;

function describeRawrHqAsyncReservation(manifest: RawrHqManifest): RawrHqAsyncReservation {
  return {
    manifest,
    role: "async",
    status: "reserved",
    workflows: Object.keys(manifest.roles.async.workflows),
    schedules: Object.keys(manifest.roles.async.schedules),
  };
}

/**
 * The sole sanctioned Phase 1 executable bridge from the canonical HQ app shell
 * into the pre-cutover server runtime.
 */
export async function bootstrapRawrHqServerViaLegacyCutover(input: {
  manifest: RawrHqManifest;
  deps?: RawrHqLegacyServerDependencies;
}): Promise<RawrHqLegacyServerBoot> {
  void input.manifest.roles.server;

  const bootstrapped = await (input.deps?.bootstrapServer ?? bootstrapServer)();

  return {
    manifest: input.manifest,
    role: "server",
    bootstrapped,
  };
}

export async function startRawrHqServerViaLegacyCutover(input: {
  manifest: RawrHqManifest;
  deps?: RawrHqLegacyServerDependencies;
}): Promise<RawrHqLegacyServerBoot> {
  const boot = await bootstrapRawrHqServerViaLegacyCutover(input);
  boot.bootstrapped.app.listen(boot.bootstrapped.config.port);
  return boot;
}

export async function startRawrHqAsyncViaLegacyCutover(input: {
  manifest: RawrHqManifest;
  log?: (message: string) => void;
}): Promise<RawrHqAsyncReservation> {
  void input.manifest.roles.async;

  const reservation = describeRawrHqAsyncReservation(input.manifest);
  input.log?.("@rawr/hq-app async role remains reserved in Phase 1");
  return reservation;
}

export async function bootstrapRawrHqDevViaLegacyCutover(input: {
  manifest: RawrHqManifest;
  deps?: RawrHqLegacyServerDependencies;
}): Promise<RawrHqLegacyDevBoot> {
  void input.manifest.roles.server;
  void input.manifest.roles.async;

  const [server, asyncRole] = await Promise.all([
    bootstrapRawrHqServerViaLegacyCutover(input),
    startRawrHqAsyncViaLegacyCutover({ manifest: input.manifest }),
  ]);

  return {
    manifest: input.manifest,
    roles: ["server", "async"],
    server,
    async: asyncRole,
  };
}

export async function startRawrHqDevViaLegacyCutover(input: {
  manifest: RawrHqManifest;
  deps?: RawrHqLegacyServerDependencies;
}): Promise<RawrHqLegacyDevBoot> {
  const boot = await bootstrapRawrHqDevViaLegacyCutover(input);
  boot.server.bootstrapped.app.listen(boot.server.bootstrapped.config.port);
  return boot;
}
