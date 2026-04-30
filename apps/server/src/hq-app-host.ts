import { startApp } from "@rawr/sdk/app";
import {
  createRawrHqApp,
  createRawrHqManifest,
  rawrHqRuntimeProfile,
  type RawrHqManifest,
} from "@rawr/hq-app/manifest";
import { bootstrapServer } from "./bootstrap";

export type RawrHqServerDependencies = {
  bootstrapServer?: typeof bootstrapServer;
};

export type RawrHqServerBoot = Readonly<{
  manifest: RawrHqManifest;
  role: "server";
  bootstrapped: Awaited<ReturnType<typeof bootstrapServer>>;
}>;

export type RawrHqAsyncReservation = Readonly<{
  manifest: RawrHqManifest;
  role: "async";
  status: "reserved";
  workflows: readonly string[];
  schedules: readonly string[];
}>;

export type RawrHqDevBoot = Readonly<{
  manifest: RawrHqManifest;
  roles: readonly ["server", "async"];
  server: RawrHqServerBoot;
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

function resolveBootstrapServer(deps?: RawrHqServerDependencies): typeof bootstrapServer {
  return deps?.bootstrapServer ?? bootstrapServer;
}

export async function bootstrapRawrHqServerRuntime(input: {
  manifest: RawrHqManifest;
  deps?: RawrHqServerDependencies;
}): Promise<RawrHqServerBoot> {
  void input.manifest.roles.server;

  const bootstrapped = await resolveBootstrapServer(input.deps)();

  return {
    manifest: input.manifest,
    role: "server",
    bootstrapped,
  };
}

export async function startRawrHqServerRuntime(input: {
  manifest: RawrHqManifest;
  deps?: RawrHqServerDependencies;
}): Promise<RawrHqServerBoot> {
  const boot = await bootstrapRawrHqServerRuntime(input);
  boot.bootstrapped.app.listen(boot.bootstrapped.config.port);
  return boot;
}

export async function startRawrHqAsyncRuntime(input: {
  manifest: RawrHqManifest;
  log?: (message: string) => void;
}): Promise<RawrHqAsyncReservation> {
  void input.manifest.roles.async;

  const reservation = describeRawrHqAsyncReservation(input.manifest);
  input.log?.("@rawr/hq-app async role remains reserved for production Inngest mounting");
  return reservation;
}

export async function bootstrapRawrHqDevRuntime(input: {
  manifest: RawrHqManifest;
  deps?: RawrHqServerDependencies;
}): Promise<RawrHqDevBoot> {
  void input.manifest.roles.server;
  void input.manifest.roles.async;

  const [server, asyncRole] = await Promise.all([
    bootstrapRawrHqServerRuntime(input),
    startRawrHqAsyncRuntime({ manifest: input.manifest }),
  ]);

  return {
    manifest: input.manifest,
    roles: ["server", "async"],
    server,
    async: asyncRole,
  };
}

export async function startRawrHqDevRuntime(input: {
  manifest: RawrHqManifest;
  deps?: RawrHqServerDependencies;
}): Promise<RawrHqDevBoot> {
  const boot = await bootstrapRawrHqDevRuntime(input);
  boot.server.bootstrapped.app.listen(boot.server.bootstrapped.config.port);
  return boot;
}

export async function bootstrapRawrHqServerHost(input: {
  deps?: RawrHqServerDependencies;
} = {}): Promise<RawrHqServerBoot> {
  const manifest = createRawrHqManifest();
  const started = await startApp(createRawrHqApp(), {
    entrypointId: "hq.server.bootstrap",
    profile: rawrHqRuntimeProfile,
    roles: ["server"],
    processId: "hq.server",
    start: () =>
      bootstrapRawrHqServerRuntime({
        manifest,
        deps: input.deps,
      }),
  });
  if (!started.value) throw new Error("hq server bootstrap host did not start");
  return started.value;
}

export async function startRawrHqServerHost(input: {
  deps?: RawrHqServerDependencies;
} = {}): Promise<RawrHqServerBoot> {
  const manifest = createRawrHqManifest();
  const started = await startApp(createRawrHqApp(), {
    entrypointId: "hq.server",
    profile: rawrHqRuntimeProfile,
    roles: ["server"],
    processId: "hq.server",
    start: () =>
      startRawrHqServerRuntime({
        manifest,
        deps: input.deps,
      }),
  });
  if (!started.value) throw new Error("hq server host did not start");
  return started.value;
}

export async function bootstrapRawrHqDevHost(input: {
  deps?: RawrHqServerDependencies;
} = {}): Promise<RawrHqDevBoot> {
  const manifest = createRawrHqManifest();
  const started = await startApp(createRawrHqApp(), {
    entrypointId: "hq.dev.bootstrap",
    profile: rawrHqRuntimeProfile,
    roles: ["server", "async"],
    processId: "hq.dev",
    start: () =>
      bootstrapRawrHqDevRuntime({
        manifest,
        deps: input.deps,
      }),
  });
  if (!started.value) throw new Error("hq dev bootstrap host did not start");
  return started.value;
}

export async function startRawrHqDevHost(input: {
  deps?: RawrHqServerDependencies;
} = {}): Promise<RawrHqDevBoot> {
  const manifest = createRawrHqManifest();
  const started = await startApp(createRawrHqApp(), {
    entrypointId: "hq.dev",
    profile: rawrHqRuntimeProfile,
    roles: ["server", "async"],
    processId: "hq.dev",
    start: () =>
      startRawrHqDevRuntime({
        manifest,
        deps: input.deps,
      }),
  });
  if (!started.value) throw new Error("hq dev host did not start");
  return started.value;
}
