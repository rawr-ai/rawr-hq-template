import { installRawrOrpcTelemetry, type InstalledTelemetry } from "@rawr/core/telemetry";
import type { Client as HqOpsClient } from "@rawr/hq-ops";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerApp } from "./app";
import { getServerConfig } from "./config";
import { resolveServerHqOpsClient } from "./hq-ops-binding";
import { registerRawrRoutes } from "./rawr";

function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

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
type BootstrapServerDependencies = {
  env: NodeJS.ProcessEnv;
  resolveRepoRoot(): string;
  installTelemetry: typeof installRawrOrpcTelemetry;
  createApp: typeof createServerApp;
  loadConfig: LoadConfig;
  registerRoutes: typeof registerRawrRoutes;
};

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

export async function bootstrapServer(
  overrides: Partial<BootstrapServerDependencies> = {}
): Promise<BootstrappedServer> {
  const deps: BootstrapServerDependencies = {
    env: process.env,
    resolveRepoRoot: defaultRepoRoot,
    installTelemetry: installRawrOrpcTelemetry,
    createApp: createServerApp,
    loadConfig: loadWorkspaceConfigFromHost,
    registerRoutes: registerRawrRoutes,
    ...overrides,
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
}
