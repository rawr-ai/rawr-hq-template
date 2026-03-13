import { installRawrOrpcTelemetry, type InstalledTelemetry } from "@rawr/core/orpc";
import { loadRawrConfig } from "@rawr/control-plane";
import { getRepoState } from "@rawr/state";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerApp } from "./app";
import { getServerConfig } from "./config";
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

type BootstrapServerDependencies = {
  env: NodeJS.ProcessEnv;
  resolveRepoRoot(): string;
  installTelemetry: typeof installRawrOrpcTelemetry;
  createApp: typeof createServerApp;
  loadConfig: typeof loadRawrConfig;
  loadPlugins: typeof loadWorkspaceServerPlugins;
  loadState: typeof getRepoState;
  registerRoutes: typeof registerRawrRoutes;
  mountPlugins: typeof mountServerPlugins;
};

export async function bootstrapServer(
  overrides: Partial<BootstrapServerDependencies> = {},
): Promise<BootstrappedServer> {
  const deps: BootstrapServerDependencies = {
    env: process.env,
    resolveRepoRoot: defaultRepoRoot,
    installTelemetry: installRawrOrpcTelemetry,
    createApp: createServerApp,
    loadConfig: loadRawrConfig,
    loadPlugins: loadWorkspaceServerPlugins,
    loadState: getRepoState,
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
  const enabledPlugins = new Set(state.plugins.enabled);

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
