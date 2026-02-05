import { createServerApp } from "./app";
import { getServerConfig } from "./config";
import { loadWorkspaceServerPlugins, mountServerPlugins } from "./plugins";
import { registerRawrRoutes } from "./rawr";
import { getRepoState } from "@rawr/state";
import { loadRawrConfig } from "@rawr/control-plane";
import path from "node:path";
import { fileURLToPath } from "node:url";

let app = createServerApp();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const env = process.env;
const envPortSpecified =
  (typeof env.RAWR_SERVER_PORT === "string" && env.RAWR_SERVER_PORT.trim() !== "") ||
  (typeof env.PORT === "string" && env.PORT.trim() !== "");
const envBaseUrlSpecified = typeof env.RAWR_SERVER_BASE_URL === "string" && env.RAWR_SERVER_BASE_URL.trim() !== "";

const baseConfig = getServerConfig(env);
const loaded = await loadRawrConfig(repoRoot);
const cfgPort = loaded.config?.server?.port;
const cfgBaseUrl = loaded.config?.server?.baseUrl;

const port = !envPortSpecified && typeof cfgPort === "number" ? cfgPort : baseConfig.port;
const baseUrl = envBaseUrlSpecified
  ? baseConfig.baseUrl
  : typeof cfgBaseUrl === "string" && cfgBaseUrl.trim() !== ""
    ? cfgBaseUrl
    : `http://localhost:${port}`;

const config = { port, baseUrl };

const [plugins, state] = await Promise.all([loadWorkspaceServerPlugins({ repoRoot }), getRepoState(repoRoot)]);
const enabled = new Set(state.plugins.enabled);

app = registerRawrRoutes(app, { repoRoot, enabledPluginIds: enabled });

const enabledPlugins = plugins.filter((p) => enabled.has(p.name));
app = await mountServerPlugins(app, enabledPlugins, { baseUrl: config.baseUrl });
app.listen(config.port);

// eslint-disable-next-line no-console
console.log(`@rawr/server listening on ${config.baseUrl}`);
