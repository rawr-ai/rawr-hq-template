import type { SearchHit } from "../model/dto";
import {
  detectSearchSource,
  facetFiltersHaveValues,
  getSearchTextCached,
  getSearchTextUncached,
  loadSearchSessions,
  resolvedCandidateLimit,
  selectSessionsByFacets,
  withRequestedFacets,
} from "../model/policy";
import { module } from "../module";

/** Searches normalized transcript text with optional service-owned cache acceleration. */
export const content = module.content.handler(async ({ context, input, errors }) => {
  try {
    const rx = new RegExp(input.pattern, input.ignoreCase ? "gmi" : "gm");
    const hits: SearchHit[] = [];
    const hasFacetFilters = facetFiltersHaveValues(input.facetFilters);
    const sessions = await loadSearchSessions(context.sourceRuntime, context.codexDiscoveryStore, {
      source: input.source,
      filters: input.filters,
      limit: hasFacetFilters ? resolvedCandidateLimit(input) : input.limit,
    });
    const selected = await selectSessionsByFacets({
      runtime: context.sourceRuntime,
      sessions,
      facetFilters: input.facetFilters,
      includeFacets: input.includeFacets,
    });

    for (const session of selected.sessions) {
      const source = await detectSearchSource(context.sourceRuntime, session.path);
      const text = input.useIndex
        ? await getSearchTextCached({
            sourceRuntime: context.sourceRuntime,
            searchTextStore: context.searchTextStore,
            filePath: session.path,
            source,
            roles: input.roles,
            includeTools: input.includeTools,
          })
        : await getSearchTextUncached(
            context.sourceRuntime,
            session.path,
            source,
            input.roles,
            input.includeTools
          );

      const matches = [...text.matchAll(rx)];
      if (!matches.length) continue;

      const start = Math.max(0, matches[0]!.index! - Math.floor(input.snippetLen / 2));
      hits.push({
        ...session,
        matchCount: matches.length,
        matchSnippet: text.slice(start, start + input.snippetLen).replaceAll("\n", "\\n"),
      });
    }

    hits.sort((a, b) =>
      a.matchCount === b.matchCount
        ? a.modified < b.modified
          ? 1
          : -1
        : b.matchCount - a.matchCount
    );

    const limited = input.maxMatches > 0 ? hits.slice(0, input.maxMatches) : hits;
    return {
      hits: input.includeFacets
        ? await withRequestedFacets(context.sourceRuntime, limited, selected.facetsByPath)
        : limited,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw errors.INVALID_REGEX({
        message: error.message,
        data: { message: error.message },
      });
    }
    throw error;
  }
});
