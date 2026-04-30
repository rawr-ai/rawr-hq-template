import { startRawrHqServerHost } from "./hq-app-host";

const { bootstrapped } = await startRawrHqServerHost();

console.log(`@rawr/server listening on ${bootstrapped.config.baseUrl}`);
