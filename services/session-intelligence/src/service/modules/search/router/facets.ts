import type { FacetSearchHit } from "../model/dto";
import {
  facetFiltersHaveValues,
  loadSearchSessions,
  resolvedCandidateLimit,
  selectSessionsByFacets,
  withRequestedFacets,
} from "../model/policy";
import { module } from "../module";

/** Finds sessions matching normalized structured facets. */
export const facets = module.facets.handler(async ({ context, input }) => {
  const sessions = await loadSearchSessions(context.sourceRuntime, context.codexDiscoveryStore, {
    source: input.source,
    filters: input.filters,
    limit: resolvedCandidateLimit(input),
  });
  const selected = await selectSessionsByFacets({
    runtime: context.sourceRuntime,
    sessions,
    facetFilters: input.facetFilters,
    includeFacets: input.includeFacets || facetFiltersHaveValues(input.facetFilters),
  });
  const limited = input.limit > 0 ? selected.sessions.slice(0, input.limit) : selected.sessions;
  const hits: FacetSearchHit[] = input.includeFacets
    ? await withRequestedFacets(context.sourceRuntime, limited, selected.facetsByPath)
    : limited;

  return { hits };
});
