import { createServerApp } from "./app";
import { getServerConfig } from "./config";
import { loadWorkspaceServerPlugins, mountServerPlugins } from "./plugins";
import { getRepoState } from "@rawr/state";
import path from "node:path";
import { fileURLToPath } from "node:url";

const config = getServerConfig();

let app = createServerApp();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const [plugins, state] = await Promise.all([loadWorkspaceServerPlugins({ repoRoot }), getRepoState(repoRoot)]);
const enabled = new Set(state.plugins.enabled);

app.get("/rawr/state", () => ({ ok: true, plugins: { enabled: Array.from(enabled).sort() } }));

const enabledPlugins = plugins.filter((p) => enabled.has(p.name));
app = await mountServerPlugins(app, enabledPlugins, { baseUrl: config.baseUrl });
app.listen(config.port);

// eslint-disable-next-line no-console
console.log(`@rawr/server listening on ${config.baseUrl}`);
