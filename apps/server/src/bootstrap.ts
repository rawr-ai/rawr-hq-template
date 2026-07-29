import path from "node:path";
import { fileURLToPath } from "node:url";
import { type InstalledTelemetry, installRawrOrpcTelemetry } from "@rawr/core/telemetry";
import type { Client as HqOpsClient } from "@rawr/hq-ops";
import { createServerApp, type RawrServerApp } from "./app";
import { getServerConfig } from "./config";
import { resolveServerHqOpsClient } from "./hq-ops-binding";

function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

/**
 * The fully composed server process returned before any listening socket is
 * opened. Process hosts use this boundary to decide when startup is complete.
 */
export type BootstrappedServer = {
  app: ReturnType<typeof createServerApp>;
  config: {
    port: number;
    baseUrl: string;
  };
  telemetry: InstalledTelemetry;
};

type LoadConfig = (
  repoRoot: string
) => Promise<Awaited<ReturnType<typeof loadWorkspaceConfigFromHost>>>;

/**
 * Mounts all server-owned routes after configuration and resources are ready.
 * The public host derives this registrar from app-selected declarations.
 */
export type ServerRouteRegistrar = (
  app: RawrServerApp,
  options: { repoRoot: string; baseUrl?: string }
) => RawrServerApp;

/**
 * Host-owned capabilities needed to assemble the server process. Tests may
 * replace these ports without moving runtime ownership into the HQ manifest.
 */
type BootstrapServerDependencies = {
  env: NodeJS.ProcessEnv;
  resolveRepoRoot(): string;
  installTelemetry: typeof installRawrOrpcTelemetry;
  createApp: typeof createServerApp;
  loadConfig: LoadConfig;
  registerRoutes: ServerRouteRegistrar;
};

/** Internal test seam for replacing bootstrap resources without exposing them to app callers. */
export type BootstrapServerInput = Readonly<{
  registerRoutes: ServerRouteRegistrar;
  overrides?: Partial<Omit<BootstrapServerDependencies, "registerRoutes">>;
}>;

type LoadWorkspaceConfigOptions = NonNullable<
  Parameters<HqOpsClient["config"]["getWorkspaceConfig"]>[1]
>;

async function loadWorkspaceConfigFromHost(repoRoot: string) {
  const client = resolveServerHqOpsClient(repoRoot);
  const options = {
    context: { invocation: { traceId: "server.config.load" } },
  } satisfies LoadWorkspaceConfigOptions;
  return await client.config.getWorkspaceConfig({}, options);
}

/**
 * Resolves configuration, telemetry, and routes into a ready server without
 * binding a port.
 */
export async function bootstrapServer(input: BootstrapServerInput): Promise<BootstrappedServer> {
  const deps: BootstrapServerDependencies = {
    env: process.env,
    resolveRepoRoot: defaultRepoRoot,
    installTelemetry: installRawrOrpcTelemetry,
    createApp: createServerApp,
    loadConfig: loadWorkspaceConfigFromHost,
    ...input.overrides,
    registerRoutes: input.registerRoutes,
  };

  const repoRoot = deps.resolveRepoRoot();
  const envPortSpecified =
    (typeof deps.env.RAWR_SERVER_PORT === "string" && deps.env.RAWR_SERVER_PORT.trim() !== "") ||
    (typeof deps.env.PORT === "string" && deps.env.PORT.trim() !== "");
  const envBaseUrlSpecified =
    typeof deps.env.RAWR_SERVER_BASE_URL === "string" &&
    deps.env.RAWR_SERVER_BASE_URL.trim() !== "";

  const baseConfig = getServerConfig(deps.env);
  const loaded = await deps.loadConfig(repoRoot);
  const cfgPort = loaded.config?.server?.port;
  const cfgBaseUrl = loaded.config?.server?.baseUrl;

  const port = !envPortSpecified && typeof cfgPort === "number" ? cfgPort : baseConfig.port;
  const baseUrl = envBaseUrlSpecified
    ? baseConfig.baseUrl
    : typeof cfgBaseUrl === "string" && cfgBaseUrl.trim() !== ""
      ? cfgBaseUrl
      : `http://localhost:${port}`;
  const config = { port, baseUrl };
  const telemetry = await deps.installTelemetry({
    serviceName: "@rawr/server",
    environment: deps.env.NODE_ENV,
    serviceVersion: deps.env.RAWR_SERVER_VERSION,
  });

  try {
    let app = deps.createApp();
    app = deps.registerRoutes(app, {
      repoRoot,
      baseUrl: config.baseUrl,
    });

    return {
      app,
      config,
      telemetry,
    };
  } catch (error) {
    await telemetry.shutdown().catch(() => undefined);
    throw error;
  }
}

/**
 * Opens the server socket only after the complete host has bootstrapped.
 * Startup failure releases the telemetry resource acquired during bootstrap.
 */
export async function startServer(input: BootstrapServerInput): Promise<BootstrappedServer> {
  const server = await bootstrapServer(input);

  try {
    server.app.listen(server.config.port);
    return server;
  } catch (error) {
    await server.telemetry.shutdown().catch(() => undefined);
    throw error;
  }
}
