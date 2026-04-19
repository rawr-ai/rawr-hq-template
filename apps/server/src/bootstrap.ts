import { installRawrOrpcTelemetry, type InstalledTelemetry } from "@rawr/core/telemetry";
import type { Client as HqOpsClient } from "@rawr/hq-ops";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerApp } from "./app";
import { getServerConfig } from "./config";
import { createRawrHostSatisfiers } from "./host-satisfiers";
import { createHostLoggerAdapter } from "./logging";
import { loadWorkspaceServerPlugins, mountServerPlugins } from "./plugins";
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
  enabledPlugins: Set<string>;
  telemetry: InstalledTelemetry;
};

type LoadConfig = (repoRoot: string) => Promise<Awaited<ReturnType<typeof loadWorkspaceConfigFromHost>>>;
type LoadState = (repoRoot: string) => Promise<Awaited<ReturnType<typeof loadRuntimeStateFromHost>>>;

type BootstrapServerDependencies = {
  env: NodeJS.ProcessEnv;
  resolveRepoRoot(): string;
  installTelemetry: typeof installRawrOrpcTelemetry;
  createApp: typeof createServerApp;
  loadConfig: LoadConfig;
  loadPlugins: typeof loadWorkspaceServerPlugins;
  loadState: LoadState;
  registerRoutes: typeof registerRawrRoutes;
  mountPlugins: typeof mountServerPlugins;
};

const bootstrapHostSatisfiers = createRawrHostSatisfiers({
  hostLogger: createHostLoggerAdapter(),
});

type LoadWorkspaceConfigOptions = NonNullable<Parameters<HqOpsClient["config"]["getWorkspaceConfig"]>[1]>;
type LoadRepoStateOptions = NonNullable<Parameters<HqOpsClient["repoState"]["getState"]>[1]>;

async function loadWorkspaceConfigFromHost(repoRoot: string) {
  const options = {
    context: { invocation: { traceId: "server.config.load" } },
  } satisfies LoadWorkspaceConfigOptions;
  return await bootstrapHostSatisfiers.state.resolveClient(repoRoot).config.getWorkspaceConfig(
    {},
    options,
  );
}

async function loadRuntimeStateFromHost(repoRoot: string) {
  const options = {
    context: { invocation: { traceId: "server.repo-state.get" } },
  } satisfies LoadRepoStateOptions;
  const response = await bootstrapHostSatisfiers.state.resolveClient(repoRoot).repoState.getState(
    {},
    options,
  );
  return response.state;
}

export async function bootstrapServer(
  overrides: Partial<BootstrapServerDependencies> = {},
): Promise<BootstrappedServer> {
  const deps: BootstrapServerDependencies = {
    env: process.env,
    resolveRepoRoot: defaultRepoRoot,
    installTelemetry: installRawrOrpcTelemetry,
    createApp: createServerApp,
    loadConfig: loadWorkspaceConfigFromHost,
    loadPlugins: loadWorkspaceServerPlugins,
    loadState: loadRuntimeStateFromHost,
    registerRoutes: registerRawrRoutes,
    mountPlugins: mountServerPlugins,
    ...overrides,
  };

  const repoRoot = deps.resolveRepoRoot();
  const envPortSpecified =
    (typeof deps.env.RAWR_SERVER_PORT === "string" && deps.env.RAWR_SERVER_PORT.trim() !== "") ||
    (typeof deps.env.PORT === "string" && deps.env.PORT.trim() !== "");
  const envBaseUrlSpecified =
    typeof deps.env.RAWR_SERVER_BASE_URL === "string" && deps.env.RAWR_SERVER_BASE_URL.trim() !== "";

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
  const [plugins, state] = await Promise.all([
    deps.loadPlugins({ repoRoot }),
    deps.loadState(repoRoot),
  ]);
  const enabledPlugins = new Set<string>(state.plugins.enabled);

  app = deps.registerRoutes(app, {
    repoRoot,
    enabledPluginIds: enabledPlugins,
    baseUrl: config.baseUrl,
  });

  const enabledPluginEntries = plugins.filter((plugin) => enabledPlugins.has(plugin.name));
  app = await deps.mountPlugins(app, enabledPluginEntries, { baseUrl: config.baseUrl });

  return {
    app,
    config,
    enabledPlugins,
    telemetry,
  };
}
