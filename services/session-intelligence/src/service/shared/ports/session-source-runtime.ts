import type {
  CodexSessionFile,
  CodexSessionSource,
  DiscoveredSessionFile,
  SessionFileStat,
  SessionSourceFilter,
  SessionStatus,
} from "../entities";

export type DiscoverSessionsInput = {
  source: SessionSourceFilter;
  limit?: number;
  project?: string;
};

/**
 * Filesystem/session source boundary for the service.
 *
 * Concrete runtimes know where Claude and Codex data live. The service can opt
 * into its own Codex indexing policy only when the runtime exposes roots plus
 * root-scoped discovery; otherwise discoverSessions remains the compatibility
 * path for runtimes that want to own discovery end to end.
 */
export interface SessionSourceRuntime {
  discoverSessions(input: DiscoverSessionsInput): Promise<DiscoveredSessionFile[]>;
  listCodexSources?(): Promise<CodexSessionSource[]>;
  discoverCodexSessionFiles?(input: CodexSessionSource): Promise<CodexSessionFile[]>;
  codexDiscoveryMaxAgeMs?(input: { status: SessionStatus }): number | Promise<number>;
  statFile(input: { path: string }): Promise<SessionFileStat | null>;
  readJsonlObjects(input: { path: string }): AsyncIterable<unknown>;
}
