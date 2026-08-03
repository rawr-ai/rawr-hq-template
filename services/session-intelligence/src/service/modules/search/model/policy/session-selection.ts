import type {
  DiscoveredSessionFile,
  SessionListItem,
  SessionSource,
  SessionSourceFilter,
  SessionStatus,
} from "../../../../model/dto";
import {
  detectSessionFormat,
  discoverCodexSessionsFromIndexOrNull,
  getClaudeSessionMetadata,
  getCodexSessionMetadata,
  hasMetadataFilters,
  inferProjectFromCwd,
  matchesSessionFilters,
  type SessionFilters,
  toModifiedIso,
} from "../../../../model/policy";
import type { CodexDiscoveryStore, SessionSourceRuntime } from "../../../../model/ports";
import { DEFAULT_FACET_CANDIDATE_LIMIT } from "../dto";
export type SearchSessionSelection = {
  source: SessionSourceFilter;
  filters?: SessionFilters;
  limit: number;
};

/** Normalizes a detected source for search-text extraction. */
export function asSearchSource(source: SessionSource | "unknown"): SessionSource {
  return source === "claude" ? "claude" : "codex";
}

/** Resolves the bounded facet candidate limit after contract defaulting. */
export function resolvedCandidateLimit(input: { candidateLimit?: number }): number {
  return input.candidateLimit ?? DEFAULT_FACET_CANDIDATE_LIMIT;
}

/** Loads normalized search candidates without entering the catalog module. */
export async function loadSearchSessions(
  sourceRuntime: SessionSourceRuntime,
  codexDiscoveryStore: CodexDiscoveryStore,
  input: SearchSessionSelection
): Promise<SessionListItem[]> {
  const limit = input.limit > 0 ? input.limit : 0;
  const filters = input.filters ?? {};
  const discovered = await (async () => {
    if (input.source === "claude") {
      return sourceRuntime.discoverSessions({
        source: "claude",
        limit: limit > 0 && !hasMetadataFilters(filters) ? limit : undefined,
        project: filters.project,
      });
    }

    const out: DiscoveredSessionFile[] = [];
    if (input.source === "all") {
      out.push(
        ...(await sourceRuntime.discoverSessions({
          source: "claude",
          limit: limit > 0 && !hasMetadataFilters(filters) ? limit : undefined,
          project: filters.project,
        }))
      );
    }

    const codexLimit = limit > 0 && !hasMetadataFilters(filters) ? limit : 0;
    const indexed = await discoverCodexSessionsFromIndexOrNull(
      sourceRuntime,
      codexDiscoveryStore,
      codexLimit
    );
    if (indexed) {
      out.push(...indexed);
    } else {
      out.push(
        ...(await sourceRuntime.discoverSessions({
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
      const meta = await getClaudeSessionMetadata(sourceRuntime, candidate.path);
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
      const meta = await getCodexSessionMetadata(sourceRuntime, candidate.path);
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
  const filtered = sessions.filter((session) => matchesSessionFilters(session, filters));
  return limit ? filtered.slice(0, limit) : filtered;
}

/** Detects and normalizes the source used to build search text for one path. */
export async function detectSearchSource(
  runtime: SessionSourceRuntime,
  path: string
): Promise<SessionSource> {
  return asSearchSource(await detectSessionFormat(runtime, path));
}
