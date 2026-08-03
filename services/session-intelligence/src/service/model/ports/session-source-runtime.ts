import type {
  CodexSessionFile,
  CodexSessionSource,
  DiscoveredSessionFile,
  SessionFileStat,
  SessionStatus,
} from "../dto";

export type DiscoverClaudeSessionsInput = {
  limit?: number;
  project?: string;
};

/**
 * Filesystem/session source boundary for the service.
 *
 * Concrete runtimes know where Claude and Codex data live. Claude discovery is
 * host-owned because its project layout is provider-specific. Codex discovery
 * is root-scoped so the service remains the sole owner of indexing policy.
 */
export interface SessionSourceRuntime {
  discoverClaudeSessions(input: DiscoverClaudeSessionsInput): Promise<DiscoveredSessionFile[]>;
  listCodexSources(): Promise<CodexSessionSource[]>;
  discoverCodexSessionFiles(input: CodexSessionSource): Promise<CodexSessionFile[]>;
  codexDiscoveryMaxAgeMs?(input: { status: SessionStatus }): number | Promise<number>;
  statFile(input: { path: string }): Promise<SessionFileStat | null>;
  readJsonlObjects(input: { path: string }): AsyncIterable<unknown>;
}
