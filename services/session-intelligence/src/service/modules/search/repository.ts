import type { SessionIndexRuntime, SessionSearchCacheEntry, SessionSearchCacheKey } from "../../shared/ports/session-index-runtime";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import { detectSessionFormat, extractClaudeMessages, extractCodexMessages } from "../../shared/normalization";
import type { RoleFilter, SessionSource } from "../../shared/schemas";
import { clearCachedSearchText, readCachedSearchText, writeCachedSearchText } from "./cache";

export function createRepository(sourceRuntime: SessionSourceRuntime, indexRuntime: SessionIndexRuntime) {
  return {
    async detectFormat(path: string) {
      return detectSessionFormat(sourceRuntime, path);
    },
    async statFile(path: string) {
      return sourceRuntime.statFile({ path });
    },
    async extractMessages(path: string, source: SessionSource, roles: RoleFilter[], includeTools: boolean) {
      return source === "claude"
        ? extractClaudeMessages(sourceRuntime, path, roles, includeTools)
        : extractCodexMessages(sourceRuntime, path, roles, includeTools);
    },
    async readCachedSearchText(input: SessionSearchCacheKey): Promise<SessionSearchCacheEntry | null> {
      return readCachedSearchText(indexRuntime, input);
    },
    async writeCachedSearchText(input: SessionSearchCacheEntry): Promise<void> {
      return writeCachedSearchText(indexRuntime, input);
    },
    async clearCachedSearchText(input: { indexPath: string; path: string }): Promise<void> {
      return clearCachedSearchText(indexRuntime, input);
    },
    async removeIndex(indexPath: string): Promise<void> {
      return indexRuntime.removeIndex({ indexPath });
    },
  };
}

export type SearchRepository = ReturnType<typeof createRepository>;
