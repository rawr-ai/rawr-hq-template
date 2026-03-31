import { startRawrHqAsyncViaLegacyCutover } from "./legacy-cutover";
import { createRawrHqManifest } from "./rawr.hq";

export const rawrHqAsyncProcessShape = ["async"] as const;

export async function startRawrHqAsync(input: {
  log?: (message: string) => void;
} = {}) {
  const manifest = createRawrHqManifest();
  return await startRawrHqAsyncViaLegacyCutover({
    manifest,
    log: input.log,
  });
}

if (import.meta.main) {
  await startRawrHqAsync();
}
