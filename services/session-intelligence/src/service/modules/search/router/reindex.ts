import { getSearchTextCached, loadSearchSessions } from "../model/policy";
import { module } from "../module";

/** Rebuilds normalized transcript search text for the selected session candidates. */
export const reindex = module.reindex.handler(async ({ context, input }) => {
  const sessions = await loadSearchSessions(
    context.sourceRuntime,
    context.codexDiscoveryStore,
    input
  );
  const total = sessions.length;
  const limit = input.limit > 0 ? Math.min(input.limit, total) : total;

  let indexed = 0;
  for (const session of sessions.slice(0, limit)) {
    await getSearchTextCached({
      sourceRuntime: context.sourceRuntime,
      searchTextStore: context.searchTextStore,
      filePath: session.path,
      source: session.source,
      roles: input.roles,
      includeTools: input.includeTools,
    });
    indexed += 1;
  }

  return { indexed, total };
});
