/**
 * session-intelligence: search module.
 *
 * This router implements session discovery + search as a first-class service
 * capability. Projections (CLI/web) can request filtered results without
 * knowing anything about file formats, session metadata extraction, or index
 * storage mechanics.
 *
 * Boundary notes:
 * - Format parsing and metadata normalization live in `common/normalization`.
 * - Index persistence/query mechanics are behind repositories (module-owned),
 *   not embedded directly in router/procedure bodies.
 * - Errors are thrown via contract-attached module errors (example-todo style).
 */

import type {
  DiscoveredSessionFile,
  RoleFilter,
  SessionListItem,
  SessionSource,
  SessionSourceFilter,
  SessionStatus,
} from "../../common/entities";
import {
  detectSessionFormat,
  getClaudeSessionMetadata,
  getCodexSessionMetadata,
  inferProjectFromCwd,
} from "../../common/normalization";
import type { SessionIndexRuntime } from "../../common/ports/session-index-runtime";
import type { SessionSourceRuntime } from "../../common/ports/session-source-runtime";
import { discoverCodexSessionsFromIndexOrNull } from "../../common/repositories/codex-indexed-discovery-repository";
import {
  DEFAULT_FACET_CANDIDATE_LIMIT,
  type FacetSearchHit,
  type MetadataSearchHit,
  type SearchHit,
  type SessionFacetFilters,
  type SessionFacets,
} from "./entities";
import { searchSessionsByMetadata } from "./helpers/metadata-search";
import { getSearchTextCached, getSearchTextUncached } from "./helpers/search-text-cache";
import {
  extractSessionFacets,
  facetFiltersHaveValues,
  facetsMatchAll,
} from "./helpers/session-facets";
import {
  hasMetadataFilters,
  matchesSearchFilters,
  type SearchSessionFilters,
  toModifiedIso,
} from "./helpers/session-filters";
import { module } from "./module";
import { clearCachedSearchText } from "./repositories/search-cache-repository";

type SearchSessionSelection = {
  source: SessionSourceFilter;
  filters?: SearchSessionFilters;
  limit: number;
};

type FacetSelection = {
  sessions: SessionListItem[];
  facetsByPath: Map<string, SessionFacets>;
};

function asSearchSource(source: SessionSource | "unknown"): SessionSource {
  return source === "claude" ? "claude" : "codex";
}

async function loadSearchSessions(
  runtime: SessionSourceRuntime,
  indexRuntime: SessionIndexRuntime,
  input: SearchSessionSelection
): Promise<SessionListItem[]> {
  const limit = input.limit > 0 ? input.limit : 0;
  const filters = input.filters ?? {};
  const discovered = await (async () => {
    // Search owns its own discovery semantics so callers can search without
    // round-tripping through catalog procedures, while still benefiting from
    // indexed Codex discovery when available.
    if (input.source === "claude") {
      return runtime.discoverSessions({
        source: "claude",
        limit: limit > 0 && !hasMetadataFilters(filters) ? limit : undefined,
        project: filters.project,
      });
    }

    const out: DiscoveredSessionFile[] = [];
    if (input.source === "all") {
      out.push(
        ...(await runtime.discoverSessions({
          source: "claude",
          limit: limit > 0 && !hasMetadataFilters(filters) ? limit : undefined,
          project: filters.project,
        }))
      );
    }

    const codexLimit = limit > 0 && !hasMetadataFilters(filters) ? limit : 0;
    const indexed = await discoverCodexSessionsFromIndexOrNull(runtime, indexRuntime, codexLimit);
    if (indexed) out.push(...indexed);
    else {
      out.push(
        ...(await runtime.discoverSessions({
          source: "codex",
          limit: codexLimit || undefined,
        }))
      );
    }

    out.sort((a, b) => b.modifiedMs - a.modifiedMs);
    return limit ? out.slice(0, limit) : out;
  })();

  const sessions: SessionListItem[] = [];
  for (const candidate of discovered) {
    if (candidate.source === "claude") {
      const meta = await getClaudeSessionMetadata(runtime, candidate.path);
      sessions.push({
        path: candidate.path,
        sessionId: meta.sessionId,
        source: "claude",
        title: meta.summaries?.at(-1) ?? meta.firstUserMessage,
        project: candidate.project,
        cwd: meta.cwd,
        gitBranch: meta.gitBranch,
        model: meta.model,
        modelProvider: meta.modelProvider,
        modified: toModifiedIso(candidate),
        started: meta.timestamp,
        sizeKb: Math.floor(candidate.sizeBytes / 1024),
      });
    } else {
      const meta = await getCodexSessionMetadata(runtime, candidate.path);
      sessions.push({
        path: candidate.path,
        sessionId: meta.sessionId,
        source: "codex",
        status: candidate.status as SessionStatus | undefined,
        title: meta.firstUserMessage,
        project: candidate.project ?? inferProjectFromCwd(meta.cwd),
        cwd: meta.cwd,
        gitBranch: meta.gitBranch,
        model: meta.model,
        modelProvider: meta.modelProvider,
        modelContextWindow: meta.modelContextWindow,
        modified: toModifiedIso(candidate),
        started: meta.timestamp,
        sizeKb: Math.floor(candidate.sizeBytes / 1024),
      });
    }
  }

  sessions.sort((a, b) => (a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : 0));
  const filtered = sessions.filter((session) => matchesSearchFilters(session, filters));
  return limit ? filtered.slice(0, limit) : filtered;
}

function resolvedCandidateLimit(input: { candidateLimit?: number }): number {
  return input.candidateLimit ?? DEFAULT_FACET_CANDIDATE_LIMIT;
}

async function selectSessionsByFacets(input: {
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

async function withRequestedFacets<Hit extends { path: string }>(
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

const metadata = module.metadata.handler(async ({ context, input }) => {
  const hasFacetFilters = facetFiltersHaveValues(input.facetFilters);
  const sessions = await loadSearchSessions(context.sourceRuntime, context.indexRuntime, {
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

const content = module.content.handler(async ({ context, input, errors }) => {
  try {
    const rx = new RegExp(input.pattern, input.ignoreCase ? "gmi" : "gm");
    const hits: SearchHit[] = [];
    const hasFacetFilters = facetFiltersHaveValues(input.facetFilters);
    const sessions = await loadSearchSessions(context.sourceRuntime, context.indexRuntime, {
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
    const indexPath = context.indexRuntime.defaultIndexPath();

    for (const session of selected.sessions) {
      const source = asSearchSource(await detectSessionFormat(context.sourceRuntime, session.path));
      const text = input.useIndex
        ? await getSearchTextCached({
            sourceRuntime: context.sourceRuntime,
            indexRuntime: context.indexRuntime,
            filePath: session.path,
            source,
            roles: input.roles,
            includeTools: input.includeTools,
            indexPath,
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
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw errors.INVALID_REGEX({
        message: err.message,
        data: { message: err.message },
      });
    }
    throw err;
  }
});

const facets = module.facets.handler(async ({ context, input }) => {
  const sessions = await loadSearchSessions(context.sourceRuntime, context.indexRuntime, {
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

const reindex = module.reindex.handler(async ({ context, input }) => {
  const sessions = await loadSearchSessions(context.sourceRuntime, context.indexRuntime, input);
  const total = sessions.length;
  const limit = input.limit > 0 ? Math.min(input.limit, total) : total;
  const indexPath = context.indexRuntime.defaultIndexPath();

  let indexed = 0;
  for (const session of sessions.slice(0, limit)) {
    const source =
      session.source ??
      asSearchSource(await detectSessionFormat(context.sourceRuntime, session.path));
    await getSearchTextCached({
      sourceRuntime: context.sourceRuntime,
      indexRuntime: context.indexRuntime,
      filePath: session.path,
      source,
      roles: input.roles,
      includeTools: input.includeTools,
      indexPath,
    });
    indexed += 1;
  }

  return { indexed, total };
});

const clearIndex = module.clearIndex.handler(async ({ context, input }) => {
  const indexPath = context.indexRuntime.defaultIndexPath();
  if (input.path) {
    await clearCachedSearchText(context.indexRuntime, { indexPath, path: input.path });
  } else {
    await context.indexRuntime.removeIndex({ indexPath });
  }
  return { cleared: true };
});

export const router = module.router({
  metadata,
  content,
  facets,
  reindex,
  clearIndex,
});
