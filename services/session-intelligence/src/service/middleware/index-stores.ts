import { base } from "../base";
import { createCodexDiscoveryStore } from "../db/stores/codex-discovery";
import { createSearchTextStore } from "../db/stores/search-text";
import type { CodexDiscoveryStore, SearchTextStore } from "../model/ports";

type ProvidedIndexStores = {
  codexDiscoveryStore: CodexDiscoveryStore;
  searchTextStore: SearchTextStore;
};

/** Projects service-owned index stores from the host-supplied SQL capability. */
export const middleware = base.middleware(async ({ context, next }) => {
  const indexRuntime = context.deps.sessionIndexRuntime;
  // One operation may cross both stores, so they share one lazy request-scoped index identity.
  let resolvedIndexPath: string | undefined;
  const indexPath = () => (resolvedIndexPath ??= indexRuntime.defaultIndexPath());
  const provided: ProvidedIndexStores = {
    codexDiscoveryStore: createCodexDiscoveryStore(indexRuntime, indexPath),
    searchTextStore: createSearchTextStore(indexRuntime, indexPath),
  };

  return next({ context: { provided } });
});
