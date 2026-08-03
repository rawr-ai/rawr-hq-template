import {
  facetFiltersHaveValues,
  loadSearchSessions,
  resolvedCandidateLimit,
  searchSessionsByMetadata,
  selectSessionsByFacets,
  withRequestedFacets,
} from "../model/policy";
import { module } from "../module";

/** Searches normalized session metadata without reading transcript search text. */
export const metadata = module.metadata.handler(async ({ context, input }) => {
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
  const hits = searchSessionsByMetadata(selected.sessions, input.needle, input.limit);

  return {
    hits: input.includeFacets
      ? await withRequestedFacets(context.sourceRuntime, hits, selected.facetsByPath)
      : hits,
  };
});
