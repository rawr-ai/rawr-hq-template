import type {
  CodexSessionFile,
  CodexSessionSource,
  DiscoveredSessionFile,
  SessionFileStat,
  SessionSourceFilter,
  SessionStatus,
} from "../schemas";

export type DiscoverSessionsInput = {
  source: SessionSourceFilter;
  limit?: number;
  project?: string;
};

export interface SessionSourceRuntime {
  discoverSessions(input: DiscoverSessionsInput): Promise<DiscoveredSessionFile[]>;
  listCodexSources?(): Promise<CodexSessionSource[]>;
  discoverCodexSessionFiles?(input: CodexSessionSource): Promise<CodexSessionFile[]>;
  codexDiscoveryMaxAgeMs?(input: { status: SessionStatus }): number | Promise<number>;
  statFile(input: { path: string }): Promise<SessionFileStat | null>;
  readJsonlObjects(input: { path: string }): AsyncIterable<unknown>;
}
