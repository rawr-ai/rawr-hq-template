import { detectSessionFormat, extractClaudeMessages, extractCodexMessages, getClaudeSessionMetadata, getCodexSessionMetadata } from "../../shared/normalization";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import type { RoleFilter, SessionSource } from "../../shared/schemas";

export function createRepository(runtime: SessionSourceRuntime) {
  return {
    async detect(path: string) {
      return detectSessionFormat(runtime, path);
    },
    async extractMessages(path: string, source: SessionSource, roles: RoleFilter[], includeTools: boolean) {
      return source === "claude"
        ? extractClaudeMessages(runtime, path, roles, includeTools)
        : extractCodexMessages(runtime, path, roles, includeTools);
    },
    async readClaudeMetadata(path: string) {
      return getClaudeSessionMetadata(runtime, path);
    },
    async readCodexMetadata(path: string) {
      return getCodexSessionMetadata(runtime, path);
    },
  };
}

export type TranscriptRepository = ReturnType<typeof createRepository>;
