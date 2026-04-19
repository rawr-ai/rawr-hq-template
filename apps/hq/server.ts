import {
  bootstrapRawrHqServerViaLegacyCutover,
  startRawrHqServerViaLegacyCutover,
  type RawrHqLegacyServerDependencies,
} from "./legacy-cutover";
import { createRawrHqManifest } from "./rawr.hq";

export const rawrHqServerProcessShape = ["server"] as const;

export async function bootstrapRawrHqServer(input: {
  deps?: RawrHqLegacyServerDependencies;
} = {}) {
  const manifest = createRawrHqManifest();
  return await bootstrapRawrHqServerViaLegacyCutover({
    manifest,
    deps: input.deps,
  });
}

export async function startRawrHqServer(input: {
  deps?: RawrHqLegacyServerDependencies;
} = {}) {
  const manifest = createRawrHqManifest();
  return await startRawrHqServerViaLegacyCutover({
    manifest,
    deps: input.deps,
  });
}

if (import.meta.main) {
  const server = await startRawrHqServer();
  console.log(`@rawr/hq-app server booted via legacy cutover on ${server.bootstrapped.config.baseUrl}`);
}
