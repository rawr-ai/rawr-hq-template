import type { SessionIndexRuntime } from "../../shared/ports/session-index-runtime";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import { reindexSessions, searchSessionsByContent, searchSessionsByMetadata } from "../../shared/search-logic";
import type { RoleFilter, SessionListItem, SessionSource } from "../../shared/schemas";

export function createRepository(sourceRuntime: SessionSourceRuntime, indexRuntime: SessionIndexRuntime) {
  return {
    async metadata(input: { sessions: SessionListItem[]; needle: string; limit: number }) {
      return searchSessionsByMetadata(input.sessions, input.needle, input.limit);
    },
    async content(input: {
      sessions: SessionListItem[];
      pattern: string;
      ignoreCase: boolean;
      maxMatches: number;
      snippetLen: number;
      roles: RoleFilter[];
      includeTools: boolean;
      useIndex: boolean;
      indexPath: string;
    }) {
      return searchSessionsByContent({
        sourceRuntime,
        indexRuntime,
        sessions: input.sessions,
        pattern: input.pattern,
        ignoreCase: input.ignoreCase,
        maxMatches: input.maxMatches,
        snippetLen: input.snippetLen,
        roles: input.roles,
        includeTools: input.includeTools,
        useIndex: input.useIndex,
        indexPath: input.indexPath,
      });
    },
    async reindex(input: {
      sessions: Array<{ path: string; source?: SessionSource }>;
      roles: RoleFilter[];
      includeTools: boolean;
      indexPath: string;
      limit: number;
    }) {
      return reindexSessions({
        sourceRuntime,
        indexRuntime,
        sessions: input.sessions,
        roles: input.roles,
        includeTools: input.includeTools,
        indexPath: input.indexPath,
        limit: input.limit,
      });
    },
    async clearIndex(input: { indexPath: string; path?: string }) {
      await indexRuntime.clearSearchText(input);
    },
  };
}
