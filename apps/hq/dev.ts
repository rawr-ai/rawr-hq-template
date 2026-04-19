import {
  bootstrapRawrHqDevViaLegacyCutover,
  startRawrHqDevViaLegacyCutover,
  type RawrHqLegacyServerDependencies,
} from "./legacy-cutover";
import { createRawrHqManifest } from "./rawr.hq";

export const rawrHqDevProcessShape = ["server", "async"] as const;

export async function bootstrapRawrHqDev(input: {
  deps?: RawrHqLegacyServerDependencies;
} = {}) {
  const manifest = createRawrHqManifest();
  return await bootstrapRawrHqDevViaLegacyCutover({
    manifest,
    deps: input.deps,
  });
}

export async function startRawrHqDev(input: {
  deps?: RawrHqLegacyServerDependencies;
} = {}) {
  const manifest = createRawrHqManifest();
  return await startRawrHqDevViaLegacyCutover({
    manifest,
    deps: input.deps,
  });
}

if (import.meta.main) {
  const dev = await startRawrHqDev();
  console.log(`@rawr/hq-app dev booted via legacy cutover on ${dev.server.bootstrapped.config.baseUrl}`);
}
