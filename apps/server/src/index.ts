import { createServerApp } from "./app";
import { getServerConfig } from "./config";
import { loadWorkspaceServerPlugins, mountServerPlugins } from "./plugins";

const config = getServerConfig();

let app = createServerApp();
const plugins = await loadWorkspaceServerPlugins();
app = await mountServerPlugins(app, plugins, { baseUrl: config.baseUrl });
app.listen(config.port);

// eslint-disable-next-line no-console
console.log(`@rawr/server listening on ${config.baseUrl}`);
