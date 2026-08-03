import type { SessionListItem } from "../../../../model/dto";
import type { SessionSourceRuntime } from "../../../../model/ports";
import type { SessionFacetFilters, SessionFacets } from "../dto";
import { extractSessionFacets, facetFiltersHaveValues, facetsMatchAll } from "./session-facets";

export type FacetSelection = {
  sessions: SessionListItem[];
  facetsByPath: Map<string, SessionFacets>;
};

/** Filters candidates by derived facets and retains already-read facet values. */
export async function selectSessionsByFacets(input: {
  runtime: SessionSourceRuntime;
  sessions: SessionListItem[];
  facetFilters?: SessionFacetFilters;
  includeFacets?: boolean;
}): Promise<FacetSelection> {
  const facetsByPath = new Map<string, SessionFacets>();
  const selected: SessionListItem[] = [];
  const shouldFilter = facetFiltersHaveValues(input.facetFilters);

  if (!shouldFilter && !input.includeFacets) {
    return { sessions: input.sessions, facetsByPath };
  }

  for (const session of input.sessions) {
    const facets = await extractSessionFacets(input.runtime, session.path);
    facetsByPath.set(session.path, facets);
    if (!shouldFilter || facetsMatchAll(facets, input.facetFilters)) {
      selected.push(session);
    }
  }

  return { sessions: selected, facetsByPath };
}

/** Adds requested facet projections while reusing values collected during filtering. */
export async function withRequestedFacets<Hit extends { path: string }>(
  runtime: SessionSourceRuntime,
  hits: Hit[],
  facetsByPath: Map<string, SessionFacets>
): Promise<Array<Hit & { facets?: SessionFacets }>> {
  const out: Array<Hit & { facets?: SessionFacets }> = [];
  for (const hit of hits) {
    let facets = facetsByPath.get(hit.path);
    if (!facets) {
      facets = await extractSessionFacets(runtime, hit.path);
      facetsByPath.set(hit.path, facets);
    }
    out.push({ ...hit, facets });
  }
  return out;
}
