import { detectSessionFormat, getClaudeSessionMetadata, getCodexSessionMetadata } from "../../shared/normalization";
import type { SessionIndexRuntime } from "../../shared/ports/session-index-runtime";
import type { DiscoverSessionsInput, SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import { discoverSessions } from "./discovery";

export function createRepository(runtime: SessionSourceRuntime, indexRuntime: SessionIndexRuntime) {
  return {
    async discoverSessions(input: DiscoverSessionsInput) {
      return discoverSessions(runtime, indexRuntime, input);
    },
    async detectFormat(path: string) {
      return detectSessionFormat(runtime, path);
    },
    async statFile(path: string) {
      return runtime.statFile({ path });
    },
    async readClaudeMetadata(path: string) {
      return getClaudeSessionMetadata(runtime, path);
    },
    async readCodexMetadata(path: string) {
      return getCodexSessionMetadata(runtime, path);
    },
  };
}

export type CatalogRepository = ReturnType<typeof createRepository>;
